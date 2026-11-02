const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const hash = value => createHash('sha256').update(value).digest('hex')
const taskFor = (settings, goal) => settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
async function refresh(settings) {
  await settings.getByRole('button', { name: '刷新', exact: true }).click()
  await settings.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent.trim() === '刷新' && !node.disabled))
}
async function unchanged(files) {
  for (const file of files) {
    assert.equal(await fs.readFile(file.path, 'utf8'), file.text)
    assert.equal((await fs.stat(file.path)).mtimeMs, file.mtimeMs)
  }
}

/** Exercise graph controls through the same host form as the field revision. */
async function reviseGraphThroughProductControls({ settings, form, future, files, classified, identity, check }) {
  const graph = future.locator('[data-work-graph-edits]')
  await graph.locator('summary').first().click()
  await graph.getByRole('button', { name: '复制为新步骤', exact: true }).click()
  const addedStepId = await future.getAttribute('data-work-selected-step-id')
  assert.match(addedStepId, /^step-/u)
  const obsoleteTarget = files[23].target
  const target = path.join(classified, 'graph-added-23.txt')
  await future.getByLabel('文件路径', { exact: true }).fill(target)
  await form.locator('fieldset').nth(23).getByLabel('文件路径', { exact: true }).fill(target)
  await future.getByRole('button', { name: '选择步骤', exact: true }).click()
  await settings.getByRole('option', { name: '25. 写入文件', exact: true }).click()
  await graph.getByRole('button', { name: '删除所选未完成步骤', exact: true }).click()
  await future.getByRole('button', { name: '选择步骤', exact: true }).click()
  await settings.getByRole('option', { name: '25. 写入文件', exact: true }).click()
  assert.equal(await future.getAttribute('data-work-selected-step-id'), addedStepId)
  const dependency = graph.getByRole('switch', { name: '17. 写入文件', exact: true })
  assert.equal(await dependency.getAttribute('aria-checked'), 'false')
  await dependency.click()
  assert.equal(await dependency.getAttribute('aria-checked'), 'true')
  files[23].target = target
  identity.graphRevision = { addedStepId, removedStepId: files[23].id, additionalDependency: files[16].id, previousDependency: files[22].id, obsoleteTarget }
  check('The host copies and edits a future operation, removes its obsolete predecessor and changes its dependencies in one requirements draft', true, { round: identity.round, addedStepId })
}

/** Prepare three real >16-step tasks; change requirements and future paths once, then leave paused for native restart. */
exports.prepareAtomicRequirementsProductChecks = async function ({ settings, chat, root, report, capture, check }) {
  assert.equal(report.rendererFocus, 'live2d')
  report.atomicRequirementExperiences = []
  for (const round of [1, 2, 3]) {
    const directory = path.join(root, `atomic-requirements-${randomUUID()}`)
    const original = path.join(directory, 'original')
    const classified = path.join(directory, 'by-date')
    await fs.mkdir(original, { recursive: true })
    await fs.mkdir(classified)
    const source = path.join(directory, 'available-source.txt')
    const missing = path.join(directory, 'missing-source.txt')
    await fs.writeFile(source, `Owned restart read fixture ${round}`, { flag: 'wx' })
    const goal = `QA 原子改版并重启 ${round} ${randomUUID()}`
    const files = Array.from({ length: 24 }, (_, index) => ({ id: `save-${index}`, path: path.join(original, `item-${index}.txt`), target: path.join(classified, `dated-${index}.txt`), text: `Accepted content ${round}/${index} 中文🙂` }))
    const criteria = files.map(file => ({ id: file.id, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: file.path, sha256: hash(file.text) } }))
    const steps = files.map((file, index) => ({ id: file.id, capabilityId: 'tool.filesystem_write_file', input: { path: file.path, content: file.text }, dependsOn: index ? [index === 17 ? 'read-barrier' : files[index - 1].id] : [], acceptanceCriterionIds: [file.id] }))
    steps.splice(17, 0, { id: 'read-barrier', capabilityId: 'tool.filesystem_read_file', input: { path: missing }, dependsOn: [files[16].id], acceptanceCriterionIds: [] })
    const proposal = { goal, criteria, steps }
    await fs.writeFile(path.join(directory, 'accepted-proposal.json'), JSON.stringify(proposal, null, 2), { flag: 'wx' })
    await sendExecutionRequest(chat, `请调用 life_execute_work_plan 严格接受这份二十五步计划。前十七步保存明确授权的新文件，第十八步读取缺失资料后应暂停，等待我在界面修正；不要创建缺失来源、重试、压缩步骤或更改任一验收条件。所有路径均为本次合成测试专用。完整参数：\n\`\`\`json\n${JSON.stringify(proposal)}\n\`\`\``)
    const targets = [...files.slice(0, 17).map(file => ({ path: file.path, marker: file.text, operation: '创建一个文件' })), { path: missing, operation: '读取文件或资料' }]
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      await approveSyntheticOperation([chat, settings], targets)
      if (await fs.readFile(files[16].path, 'utf8').catch(() => null) === files[16].text)
        break
      await wait(100)
    }
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    const task = taskFor(settings, goal)
    const blockedBy = Date.now() + 45000
    while (Date.now() < blockedBy) {
      await approveSyntheticOperation([chat, settings], targets)
      if (await task.getByRole('button', { name: '修改验收要求', exact: true }).isVisible() && await task.getByRole('button', { name: '调整未完成步骤', exact: true }).isVisible())
        break
      await wait(150)
    }
    await task.locator('summary').click()
    await task.locator('ol > li').filter({ hasText: '17. 写入文件' }).getByText('操作结果已观察，目标仍需验收', { exact: true }).waitFor({ timeout: 15000 })
    const preserved = await Promise.all(files.slice(0, 17).map(async file => ({ ...file, mtimeMs: (await fs.stat(file.path)).mtimeMs })))
    const identity = { round, goal, directory, source, missing, planId: await task.getAttribute('data-work-plan-id'), obligationId: await task.getAttribute('data-work-obligation-id'), originalContractHash: await task.getAttribute('data-work-contract-hash'), preserved, unfinished: files.slice(17), prepared: false }
    report.atomicRequirementExperiences.push(identity)
    await task.getByRole('button', { name: '修改验收要求', exact: true }).click()
    const form = task.getByRole('form', { name: '修改验收要求', exact: true })
    const future = form.locator('[data-future-step-edits]')
    for (const [offset, file] of files.slice(17).entries()) {
      await future.getByRole('button', { name: '选择步骤', exact: true }).click()
      await settings.getByRole('option', { name: `${offset + 19}. 写入文件`, exact: true }).click()
      await future.getByLabel('文件路径', { exact: true }).fill(file.target)
      await form.locator('fieldset').nth(offset + 17).getByLabel('文件路径', { exact: true }).fill(file.target)
    }
    if (process.env.LIFE_PRODUCT_GRAPH_REQUIREMENTS === '1')
      await reviseGraphThroughProductControls({ settings, form, future, files, classified, identity, check })
    await refresh(settings)
    assert.equal(await future.getByLabel('文件路径', { exact: true }).inputValue(), files[23].target)
    for (const [offset, file] of files.slice(17).entries()) assert.equal(await form.locator('fieldset').nth(offset + 17).getByLabel('文件路径', { exact: true }).inputValue(), file.target)
    await future.getByRole('button', { name: '选择步骤', exact: true }).click()
    await settings.getByRole('option', { name: '19. 写入文件', exact: true }).click()
    assert.equal(await future.getByLabel('文件路径', { exact: true }).inputValue(), files[17].target)
    check('A live refresh and selection change retain all seven future-step and criterion edits', true, { round })
    await form.getByRole('button', { name: '保存新要求', exact: true }).click()
    await settings.waitForFunction(({ planId, oldHash }) => {
      const node = document.querySelector(`article[data-work-plan-id="${planId}"]`)
      return node?.dataset.workGeneration === '2' && node.dataset.workPlanRevision === '2' && node.dataset.workContractHash !== oldHash
    }, { planId: identity.planId, oldHash: identity.originalContractHash }, { timeout: 15000 })
    assert.equal(await task.getAttribute('data-work-obligation-id'), identity.obligationId)
    identity.revisedContractHash = await task.getAttribute('data-work-contract-hash')
    await unchanged(preserved)
    for (const file of files.slice(17)) {
      assert.equal(await fs.stat(file.path).then(() => true, () => false), false)
      assert.equal(await fs.stat(file.target).then(() => true, () => false), false)
    }
    await settings.reload()
    assert.equal(await task.getAttribute('data-work-generation'), '2')
    await capture(settings, `atomic-requirements-${round}-paused-before-native-restart`)
    identity.prepared = true
    check('One actual host save changes the same task generation and both future inputs and requirements while preserving seventeen settled writes', true, { round })
  }
}

/** Run after the previous native process exited; the model never reconstructs the accepted plan. */
exports.finishAtomicRequirementsAfterRestart = async function ({ settings, stage, pages, report, experience, capture, check }) {
  async function drawing() {
    const deadline = Date.now() + 45000
    while (Date.now() < deadline) {
      const body = await sampleLive2D(stage)
      if (body.models.length === 1 && body.models[0].drawFrame?.frame > 0 && body.models[0].probes.some(point => point.pixel[3] > 64))
        return body
      await wait(150)
    }
    throw new Error('Cold-restarted Live2D must actually draw before continuing owned work')
  }
  const task = taskFor(settings, experience.goal)
  await task.waitFor({ timeout: 30000 })
  assert.equal(await task.getAttribute('data-work-plan-id'), experience.planId)
  assert.equal(await task.getAttribute('data-work-obligation-id'), experience.obligationId)
  assert.equal(await task.getAttribute('data-work-generation'), '2')
  assert.equal(await task.getAttribute('data-work-plan-revision'), '2')
  assert.equal(await task.getAttribute('data-work-contract-hash'), experience.revisedContractHash)
  await unchanged(experience.preserved)
  await task.getByRole('button', { name: '调整未完成步骤', exact: true }).click()
  const editor = task.getByRole('form', { name: '调整未完成步骤', exact: true })
  assert.equal(await editor.getByLabel('文件路径', { exact: true }).inputValue(), experience.missing)
  await editor.getByLabel('文件路径', { exact: true }).fill(experience.source)
  await editor.getByRole('button', { name: '保存调整', exact: true }).click()
  await settings.getByRole('status').filter({ hasText: '调整已保存，可以继续处理。' }).waitFor({ timeout: 15000 })
  const before = await drawing()
  await task.getByRole('button', { name: '继续处理', exact: true }).click()
  const targets = [{ path: experience.source, operation: '读取文件或资料' }, ...experience.unfinished.map(file => ({ path: file.target, marker: file.text, operation: '创建一个文件' }))]
  const deadline = Date.now() + 90000
  while (Date.now() < deadline) {
    await approveSyntheticOperation(pages ?? [settings, stage], targets)
    const last = experience.unfinished.at(-1)
    if (await fs.readFile(last.target, 'utf8').catch(() => null) === last.text) {
      for (const page of pages ?? [settings, stage])
        await page.getByRole('dialog', { name: '确认这次操作', exact: true }).waitFor({ state: 'hidden', timeout: 10000 })
      await refresh(settings)
      if (await task.getByRole('status').filter({ hasText: '结果已确认' }).isVisible())
        break
    }
    await wait(150)
  }
  await task.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
  await unchanged(experience.preserved)
  for (const file of experience.unfinished) {
    assert.equal(await fs.readFile(file.target, 'utf8'), file.text)
    assert.equal(await fs.stat(file.path).then(() => true, () => false), false)
  }
  assert.equal(await task.getAttribute('data-work-plan-revision'), '3')
  assert.equal(await task.getAttribute('data-work-generation'), '2')
  const after = await drawing()
  assert.ok(after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
  await capture(settings, `atomic-requirements-${experience.round}-fulfilled-after-native-restart`)
  experience.completed = true
  report.atomicRequirementExperiences ??= []
  report.atomicRequirementExperiences.push(experience)
  check('After a complete native restart, the same responsibility writes only seven revised outputs, preserves all seventeen prior writes and reaches independent completion with Live2D active', true, { round: experience.round })
}
