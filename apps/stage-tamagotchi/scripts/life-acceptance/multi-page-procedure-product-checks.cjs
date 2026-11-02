/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify actual method controls. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:http')
const path = require('node:path')
const process = require('node:process')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const digest = value => createHash('sha256').update(value).digest('hex')

/** Configured model, real UI controls/pages/files, then independent journal inspection. */
exports.runMultiPageProcedureProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  const count = Number(process.env.LIFE_PRODUCT_MULTI_PAGE_COUNT ?? 2)
  assert.ok([2, 4].includes(count))
  const nonce = randomUUID()
  const pages = new Map()
  const requests = []
  const server = createServer((request, response) => {
    requests.push({ url: request.url, method: request.method })
    const text = request.method === 'GET' ? pages.get(request.url) : undefined
    response.statusCode = text === undefined ? 404 : 200
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-security-policy', 'default-src \'none\'; frame-ancestors \'none\'')
    const escaped = (text ?? 'Owned page unavailable').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    response.end(`<html><body><pre>${escaped}</pre></body></html>`)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  const region = settings.locator('[data-learned-procedures]')
  const task = goal => settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
  function files(prefix, invalid = false) {
    return Array.from({ length: count }, (_, index) => {
      const text = `Independent ${prefix} page ${index} ${nonce} 中文🙂 & <page>`
      const marker = invalid && index === 1 ? `Actual changed second page ${randomUUID()} 中文🙂` : text
      const key = `/${nonce}/${prefix}-${index}`
      pages.set(key, marker)
      return { url: origin + key, path: path.join(root, `${prefix}-${index}.txt`), marker, expectedHash: digest(text), sha256: digest(marker) }
    })
  }
  const approve = values => approveSyntheticOperation([chat, settings], values.map(file => ({ path: file.path, marker: file.marker, bytes: Buffer.byteLength(file.marker), operation: '创建一个文件' })))
  async function completed(goal, values) {
    const item = task(goal)
    const deadline = Date.now() + 90000
    while (Date.now() < deadline) {
      await approve(values)
      if (await item.getByRole('status').filter({ hasText: '结果已确认' }).isVisible())
        break
      await wait(200)
    }
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
    for (const file of values) assert.equal(await fs.readFile(file.path, 'utf8'), file.marker)
    return { planId: await item.getAttribute('data-work-plan-id'), obligationId: await item.getAttribute('data-work-obligation-id') }
  }
  async function freshMethod(previous, expectedId) {
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      await region.getByRole('button', { name: '刷新方法', exact: true }).click()
      const items = (await region.locator('article').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.procedureId, version: node.dataset.procedureVersion })))).filter(item => !previous.has(item.version))
      if (items.length) {
        assert.equal(items.length, 1)
        if (expectedId)
          assert.equal(items[0].id, expectedId)
        return items[0]
      }
      await wait(250)
    }
    throw new Error('The independently successful source did not publish one new method version')
  }
  const method = identity => region.locator(`article[data-procedure-id="${identity.id}"][data-procedure-version="${identity.version}"]`)
  async function activate(identity) {
    const item = method(identity)
    await item.getByRole('heading', { name: `按顺序保存 ${count} 个网页`, exact: true }).waitFor()
    assert.equal(await item.getByRole('button', { name: '启用', exact: true }).count(), 0)
    await item.getByRole('button', { name: '用不同内容测试', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 90000 })
    const expected = 6 + count * 2
    assert.ok((await item.innerText()).includes(`${expected} / ${expected} 项复跑检查通过`))
    await item.getByRole('button', { name: '启用', exact: true }).click()
    await item.getByText('已启用', { exact: true }).waitFor()
    await settings.reload()
    await item.getByText('已启用', { exact: true }).waitFor()
    check('The actual UI requires every distinct-page and page-mismatch evaluation before activation', true, { pages: count, cases: expected })
  }
  async function source(prefix, expectedId) {
    const previous = new Set(await region.locator('article').evaluateAll(nodes => nodes.map(node => node.dataset.procedureVersion)))
    const values = files(prefix)
    if (count === 2 && prefix === 'source')
      Object.assign(values[1], { url: values[0].url, marker: values[0].marker, expectedHash: values[0].expectedHash, sha256: values[0].sha256 })
    const goal = `QA 多页面方法来源 ${count} ${prefix} ${nonce}`
    const steps = values.flatMap((file, index) => [
      { id: `open-${index}`, capabilityId: 'tool.browser_open_url', input: { url: file.url }, dependsOn: index ? [`save-${index - 1}`] : [], acceptanceCriterionIds: [] },
      { id: `read-${index}`, capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: [`open-${index}`], acceptanceCriterionIds: [] },
      { id: `save-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path: file.path }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'] }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`bytes-${index}`] },
    ])
    const proposal = { goal, criteria: values.map((file, index) => ({ id: `bytes-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: file.path, sha256: file.expectedHash } })), steps }
    await sendExecutionRequest(chat, `请调用 life_execute_work_plan 严格接受下面完整计划，保留步骤次序、依赖、验收和inputBindings。必须读取每个当前网页，不能用示例文字或直接文件工具替代。全部资料为本次自有测试。\n\`\`\`json\n${JSON.stringify(proposal)}\n\`\`\``)
    const proof = await completed(goal, values)
    for (const file of values) file.mtimeMs = (await fs.stat(file.path)).mtimeMs
    const identity = await freshMethod(previous, expectedId)
    return { ...identity, goal, files: values, ...proof }
  }
  async function unchanged(values) {
    for (const file of values) {
      assert.equal(await fs.readFile(file.path, 'utf8'), file.marker)
      assert.equal((await fs.stat(file.path)).mtimeMs, file.mtimeMs)
    }
  }
  async function use(identity, prefix, invalid = false) {
    const values = files(prefix, invalid)
    const goal = `QA 多页面方法复用 ${prefix} ${nonce}`
    const mapping = values.map((file, index) => ({ page: index + 1, navigationStep: `step${index * 3 + 1}`, writeStep: `step${index * 3 + 3}`, criterion: `result${index + 1}`, url: file.url, path: file.path, sha256: file.expectedHash }))
    await sendExecutionRequest(chat, `请先调用 life_list_learned_procedures 查询已启用 id=${identity.id}、version=${identity.version}，按参数的kind/role/uses关联填齐本次${count}组url、文件path、expected-hash。映射：${JSON.stringify(mapping)}。正文只能来自该方法的实际网页读取，不新增content参数、不用直接工具或新计划代替。调用 life_use_learned_procedure，goal必须为${goal}。仅允许本次自有网页和新文件。`)
    if (invalid) {
      const deadline = Date.now() + 90000
      while (Date.now() < deadline) {
        await approve(values)
        await region.getByRole('button', { name: '刷新方法', exact: true }).click()
        if (await method(identity).getByText('需要修复并重新评估', { exact: true }).isVisible())
          break
        await wait(200)
      }
      await method(identity).getByText('需要修复并重新评估', { exact: true }).waitFor({ timeout: 3000 })
      for (const file of values) assert.equal(await fs.readFile(file.path, 'utf8'), file.marker)
      assert.equal(await task(goal).getByRole('status').filter({ hasText: '结果已确认' }).count(), 0)
      assert.notEqual(values[1].expectedHash, values[1].sha256)
      await settings.reload()
      await method(identity).getByText('需要修复并重新评估', { exact: true }).waitFor()
      return { ...identity, goal, files: values, planId: await task(goal).getAttribute('data-work-plan-id'), obligationId: await task(goal).getAttribute('data-work-obligation-id') }
    }
    const proof = await completed(goal, values)
    const before = await sampleLive2D(stage)
    await wait(150)
    const after = await sampleLive2D(stage)
    check('The multi-page method delivers every independently verified file while actual Live2D keeps drawing', after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame, { pages: count })
    await capture(settings, prefix)
    return { ...identity, goal, files: values, ...proof }
  }
  try {
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    await region.getByRole('heading', { name: '学习到的方法', exact: true }).waitFor()
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    const original = await source('source')
    await activate(original)
    report.multiPageProcedure = { count, original, uses: [], repairedUses: [] }
    for (const round of [1, 2, 3]) {
      report.multiPageProcedure.uses.push(await use(original, `fresh-${round}`))
      await unchanged(original.files)
    }
    report.multiPageProcedure.failure = await use(original, 'changed-second-page', true)
    check('A changed second page downgrades the exact multi-page version and never certifies its root', true)
    const repaired = await source('corrected-source', original.id)
    assert.notEqual(repaired.version, original.version)
    report.multiPageProcedure.repaired = repaired
    await activate(repaired)
    for (const round of [1, 2, 3]) {
      report.multiPageProcedure.repairedUses.push(await use(repaired, `repaired-${round}`))
      await unchanged(original.files)
      await unchanged(repaired.files)
    }
    await method(repaired).getByRole('button', { name: '停用此版本', exact: true }).click()
    await method(repaired).getByText('来源已失效', { exact: true }).waitFor()
    await settings.reload()
    await method(repaired).getByText('来源已失效', { exact: true }).waitFor()
    check('The repaired multi-page version is revoked persistently without changing either source', true)
    assert.ok(requests.length >= count * 8 && requests.every(request => request.method === 'GET'))
    report.multiPageProcedure.requests = requests
  }
  finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}
