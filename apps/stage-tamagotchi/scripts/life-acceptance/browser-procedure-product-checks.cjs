/* eslint-disable unicorn/prefer-dom-node-text-content -- Inspect actual rendered result and method controls. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:http')
const path = require('node:path')
const process = require('node:process')

const { runBrowserProcedureRepairProductChecks } = require('./browser-procedure-repair-product-checks.cjs')
const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { runInteractiveFormProductChecks } = require('./interactive-form-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const digest = text => createHash('sha256').update(text).digest('hex')

exports.runBrowserProcedureProductChecks = async function (context) {
  if (process.env.LIFE_PRODUCT_INTERACTIVE_FORM === '1' || process.env.LIFE_PRODUCT_UPLOAD_METHOD === '1')
    return runInteractiveFormProductChecks(context)
  const { settings, chat, stage, root, report, capture, check } = context
  const nonce = randomUUID()
  const pages = new Map()
  const requests = []
  const server = createServer((request, response) => {
    requests.push({ path: request.url, method: request.method })
    const text = request.method === 'GET' ? pages.get(request.url) : undefined
    response.statusCode = text === undefined ? 404 : 200
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('content-security-policy', 'default-src \'none\'; frame-ancestors \'none\'')
    response.setHeader('cache-control', 'no-store')
    const escaped = (text ?? 'Owned test page unavailable').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    response.end(`<html><head><title>Owned browser method fixture</title></head><body><pre>${escaped}</pre></body></html>`)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  function page(name, text) {
    const key = `/${nonce}/${name}`
    pages.set(key, text)
    return origin + key
  }
  async function result(goal, target, marker) {
    const item = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
    const deadline = Date.now() + 60000
    while (Date.now() < deadline && !await item.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) {
      await approveSyntheticOperation([chat, settings], [{ path: target, marker, bytes: Buffer.byteLength(marker), operation: '创建一个文件' }])
      await wait(200)
    }
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
    assert.equal(await fs.readFile(target, 'utf8'), marker)
    return item
  }
  try {
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    const region = settings.locator('[data-learned-procedures]')
    await region.getByRole('heading', { name: '学习到的方法', exact: true }).waitFor()
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    const previous = new Set(await region.locator('article').evaluateAll(nodes => nodes.map(node => node.dataset.procedureVersion)))
    const marker = `Private browser source ${nonce} 中文🙂 & <source>`
    const sourceUrl = page('source', marker)
    const sourcePath = path.join(root, 'browser-method-original.txt')
    const sourceGoal = `QA 浏览器方法来源 ${nonce}`
    const proposal = { goal: sourceGoal, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: sourcePath, sha256: digest(marker) } }], steps: [
      { id: 'open', capabilityId: 'tool.browser_open_url', input: { url: sourceUrl }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: ['open'], acceptanceCriterionIds: [] },
      { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: sourcePath }, inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }], dependsOn: ['read'], acceptanceCriterionIds: ['bytes'] },
    ] }
    await sendExecutionRequest(chat, `请调用 life_execute_work_plan 接受下面完整工作计划，逐项保留 goal、criteria、steps 和 inputBindings，不用直接文件工具代替，也不要只口头回答。网页和文件都是本次拥有的合成测试资料。\n\`\`\`json\n${JSON.stringify(proposal)}\n\`\`\``)
    await result(sourceGoal, sourcePath, marker)
    const sourceBefore = await fs.stat(sourcePath)
    let fresh = []
    const by = Date.now() + 20000
    while (Date.now() < by) {
      await region.getByRole('button', { name: '刷新方法', exact: true }).click()
      fresh = (await region.locator('article').evaluateAll(nodes => nodes.map(node => ({ version: node.dataset.procedureVersion, id: node.dataset.procedureId })))).filter(item => !previous.has(item.version))
      if (fresh.length)
        break
      await wait(250)
    }
    assert.equal(fresh.length, 1, 'The source task must publish one distinct candidate without retargeting an older method')
    const { id, version } = fresh[0]
    assert.match(id, /^skill\.learned_[a-f0-9]{24}$/u)
    assert.match(version, /^[a-f0-9]{64}$/u)
    const method = region.locator(`article[data-procedure-id="${id}"][data-procedure-version="${version}"]`)
    await method.getByRole('button', { name: '用不同内容测试', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 60000 })
    check('Browser method requires all seven dedicated replay cases in the actual product', (await method.innerText()).includes('7 / 7 项复跑检查通过'))
    await method.getByRole('button', { name: '启用', exact: true }).click()
    await method.getByText('已启用', { exact: true }).waitFor()
    await settings.reload()
    await method.getByText('已启用', { exact: true }).waitFor()
    report.browserProcedureSource = { id, version, sourceGoal, sourceUrl, sourcePath, marker, sha256: digest(marker), mtimeMs: sourceBefore.mtimeMs }
    report.browserProcedureExperiences = []
    for (const round of [1, 2, 3]) {
      const content = `New browser page ${round} ${randomUUID()} 中文🙂 & <fresh>`
      const url = page(`fresh-${round}`, content)
      const target = path.join(root, `browser-method-output-${round}.txt`)
      const goal = `QA 浏览器方法复用 ${randomUUID()}`
      await sendExecutionRequest(chat, `请先调用 life_list_learned_procedures，找到 id=${id}、version=${version} 的已启用方法。按参数 kind、role 和 uses 填入本次参数：page-url/url 为 ${url}，write_file 的 path 为 ${target}，expected-hash/sha256 为 ${digest(content)}。正文必须来自该方法中实际网页读取，不要加入文字参数，也不要用直接工具或新建计划替代。调用 life_use_learned_procedure，goal 必须为 ${goal}。只允许当前合成网页和目标文件。`)
      const item = await result(goal, target, content)
      assert.equal(await fs.readFile(sourcePath, 'utf8'), marker)
      assert.equal((await fs.stat(sourcePath)).mtimeMs, sourceBefore.mtimeMs)
      const before = await sampleLive2D(stage)
      await wait(150)
      const after = await sampleLive2D(stage)
      check('Browser method delivers the new page and keeps Live2D drawing', after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
      await item.scrollIntoViewIfNeeded()
      await capture(settings, `browser-method-delivery-${round}`)
      report.browserProcedureExperiences.push({ id, version, round, goal, url, target, marker: content, sha256: digest(content) })
    }
    let activeMethod = method
    if (process.env.LIFE_PRODUCT_BROWSER_PROCEDURE_REPAIR === '1')
      activeMethod = await runBrowserProcedureRepairProductChecks({ context: { settings, chat, stage, root, report, capture, check }, region, method, id, version, page, result, sourcePath, sourceBefore, marker })
    await activeMethod.getByRole('button', { name: '停用此版本', exact: true }).click()
    await activeMethod.getByText('来源已失效', { exact: true }).waitFor()
    await settings.reload()
    await activeMethod.getByText('来源已失效', { exact: true }).waitFor()
    check('Browser method source revocation persists in the actual settings page', true)
    assert.ok(requests.some(request => request.path.endsWith('/source')))
    assert.ok([1, 2, 3].every(round => requests.some(request => request.path.endsWith(`/fresh-${round}`))))
    report.browserProcedureRequests = requests
  }
  finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}
