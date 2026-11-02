/* eslint-disable unicorn/prefer-dom-node-text-content -- Read real method controls and task outcomes. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const digest = text => createHash('sha256').update(text).digest('hex')

/** Actual product controls, configured model, real pages and independent file checks. */
exports.runBrowserProcedureRepairProductChecks = async function ({ context, region, method, id, version, page, result, sourcePath, sourceBefore, marker }) {
  const { settings, chat, stage, root, report, capture, check } = context
  const invalidText = `Actual changed page ${randomUUID()} 中文🙂`
  const requiredText = `Current required result ${randomUUID()}`
  const invalidUrl = page('invalid-use', invalidText)
  const invalidPath = path.join(root, 'browser-method-invalid-result.txt')
  const invalidGoal = `QA 方法失效 ${randomUUID()}`
  async function use(methodId, methodVersion, goal, url, target, expectedHash) {
    await sendExecutionRequest(chat, `请先调用 life_list_learned_procedures，找到 id=${methodId}、version=${methodVersion} 的已启用方法。page-url/url=${url}，write_file 的 path=${target}，expected-hash/sha256=${expectedHash}。正文只能来自方法中的实际网页读取，不加入文字参数，不用直接工具或新计划代替。调用 life_use_learned_procedure，goal 必须为 ${goal}。只允许当前合成网页和目标文件。`)
  }
  await use(id, version, invalidGoal, invalidUrl, invalidPath, digest(requiredText))
  const invalidTask = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: invalidGoal })
  const by = Date.now() + 60000
  while (Date.now() < by) {
    await approveSyntheticOperation([chat, settings], [{ path: invalidPath, marker: invalidText, bytes: Buffer.byteLength(invalidText), operation: '创建一个文件' }])
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    if (await method.getByText('需要修复并重新评估', { exact: true }).isVisible())
      break
    await wait(200)
  }
  await method.getByText('需要修复并重新评估', { exact: true }).waitFor({ timeout: 3000 })
  assert.equal(await fs.readFile(invalidPath, 'utf8'), invalidText)
  assert.notEqual(digest(invalidText), digest(requiredText))
  assert.equal(await invalidTask.getByRole('status').filter({ hasText: '结果已确认' }).count(), 0)
  assert.equal(await method.getByRole('button', { name: '启用', exact: true }).count(), 0)
  assert.equal(await method.getByRole('button', { name: '用不同内容测试', exact: true }).count(), 0)
  report.browserProcedureFailure = { id, version, goal: invalidGoal, url: invalidUrl, target: invalidPath, actual: invalidText, requiredHash: digest(requiredText), actualHash: digest(invalidText), planId: await invalidTask.getAttribute('data-work-plan-id'), obligationId: await invalidTask.getAttribute('data-work-obligation-id') }
  await settings.reload()
  await method.getByText('需要修复并重新评估', { exact: true }).waitFor()
  await capture(settings, 'browser-method-actual-failure-downgrade')
  check('An actual changed page fails its new byte criterion and leaves the old method unavailable after reload', true)

  const versions = new Set(await region.locator('article').evaluateAll(nodes => nodes.map(node => node.dataset.procedureVersion)))
  const correctedText = `Corrected independent source ${randomUUID()} 中文🙂`
  const correctedUrl = page('corrected-source', correctedText)
  const correctedPath = path.join(root, 'browser-method-corrected-source.txt')
  const correctedGoal = `QA 修复方法新来源 ${randomUUID()}`
  const proposal = { goal: correctedGoal, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: correctedPath, sha256: digest(correctedText) } }], steps: [
    { id: 'open', capabilityId: 'tool.browser_open_url', input: { url: correctedUrl }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: ['open'], acceptanceCriterionIds: [] },
    { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: correctedPath }, inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }], dependsOn: ['read'], acceptanceCriterionIds: ['bytes'] },
  ] }
  await sendExecutionRequest(chat, `请调用 life_execute_work_plan 接受下面完整工作计划，逐项保留 goal、criteria、steps 和 inputBindings。按当前要求取得新的独立成功，不恢复旧方法的旧评估，也不用直接文件工具代替。所有资料属于本次合成测试。\n\`\`\`json\n${JSON.stringify(proposal)}\n\`\`\``)
  await result(correctedGoal, correctedPath, correctedText)
  let fresh = []
  const freshBy = Date.now() + 20000
  while (Date.now() < freshBy) {
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    fresh = (await region.locator('article').evaluateAll(nodes => nodes.map(node => ({ version: node.dataset.procedureVersion, id: node.dataset.procedureId })))).filter(item => !versions.has(item.version))
    if (fresh.length)
      break
    await wait(250)
  }
  assert.equal(fresh.length, 1)
  assert.equal(fresh[0].id, id)
  assert.notEqual(fresh[0].version, version)
  const repairedVersion = fresh[0].version
  const repaired = region.locator(`article[data-procedure-id="${id}"][data-procedure-version="${repairedVersion}"]`)
  assert.equal(await repaired.getByRole('button', { name: '启用', exact: true }).count(), 0)
  await repaired.getByRole('button', { name: '用不同内容测试', exact: true }).click()
  await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 60000 })
  assert.ok((await repaired.innerText()).includes('7 / 7 项复跑检查通过'))
  const comparison = repaired.locator('[data-procedure-comparison]')
  await comparison.waitFor()
  assert.equal(await comparison.getAttribute('data-procedure-comparison-baseline'), version)
  assert.ok((await comparison.innerText()).includes('旧版：完成 2/2'))
  assert.ok((await comparison.innerText()).includes('候选：完成 2/2'))
  check('A replacement version shows paired completion, operation, retry and approval evidence against the exact old version', true)
  await capture(settings, 'browser-repaired-method-version-comparison')
  await repaired.getByRole('button', { name: '启用', exact: true }).click()
  await repaired.getByText('已启用', { exact: true }).waitFor()
  await settings.reload()
  await repaired.getByText('已启用', { exact: true }).waitFor()
  await method.getByText('需要修复并重新评估', { exact: true }).waitFor()
  report.browserProcedureRepairSource = { id, version: repairedVersion, sourceGoal: correctedGoal, sourceUrl: correctedUrl, sourcePath: correctedPath, marker: correctedText, sha256: digest(correctedText), mtimeMs: (await fs.stat(correctedPath)).mtimeMs, previousVersion: version }
  report.browserProcedureRepairedExperiences = []
  check('The actual UI requires new successful source evidence and all dedicated replays before enabling a repaired version', true)
  for (const round of [1, 2, 3]) {
    const content = `Repaired method fresh page ${round} ${randomUUID()} 中文🙂`
    const url = page(`repaired-fresh-${round}`, content)
    const target = path.join(root, `browser-repaired-method-output-${round}.txt`)
    const goal = `QA 修复方法复用 ${randomUUID()}`
    await use(id, repairedVersion, goal, url, target, digest(content))
    const task = await result(goal, target, content)
    const before = await sampleLive2D(stage)
    await wait(150)
    const after = await sampleLive2D(stage)
    check('A newly evaluated replacement fulfills the current task while actual Live2D drawing continues', after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
    report.browserProcedureRepairedExperiences.push({ id, version: repairedVersion, round, goal, url, target, marker: content, sha256: digest(content) })
    await task.scrollIntoViewIfNeeded()
    await capture(settings, `browser-repaired-method-delivery-${round}`)
  }
  assert.equal(await fs.readFile(sourcePath, 'utf8'), marker)
  assert.equal((await fs.stat(sourcePath)).mtimeMs, sourceBefore.mtimeMs)
  return repaired
}
