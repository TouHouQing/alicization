/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify actual rendered method controls and work results. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:http')
const path = require('node:path')
const process = require('node:process')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')
const { approveOwnedUpload, closeOwnedUploadWindow } = require('./upload-method-product-fixture.cjs')

const digest = text => createHash('sha256').update(text).digest('hex')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const html = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const wireText = text => text.replace(/\r\n|\r|\n/gu, '\r\n')

exports.runInteractiveFormProductChecks = async function ({ app, settings, chat, stage, root, report, capture, check }) {
  const uploading = process.env.LIFE_PRODUCT_UPLOAD_METHOD === '1'
  const readUploads = uploading ? (await import('../../src/main/services/alicization/execution/procedure-form-upload.ts')).readProcedureFormUpload : null
  const replayCount = uploading ? 11 : 10
  const nonce = randomUUID()
  const forms = new Map()
  const requests = []
  const server = createServer((request, response) => {
    void (async () => {
      const record = forms.get(request.url?.replace(/\/submit$/u, ''))
      requests.push({ method: request.method, path: request.url })
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.setHeader('cache-control', 'no-store')
      response.setHeader('content-security-policy', 'default-src \'none\'; form-action \'self\'; frame-ancestors \'none\'')
      if (!record) {
        response.statusCode = 404
        response.end('Unknown owned form')
        return
      }
      if (request.method === 'GET' && request.url === record.route) {
        const fields = record.fields.map((field, index) => `<label>${html(field.label)}<textarea name="field${index}"></textarea></label>`).join('')
        const upload = uploading ? `<label>${html(record.uploadLabel)}<input type="file" name="upload0" multiple></label>` : ''
        response.end(`<html><head><title>Owned interactive product case</title></head><body><form method="post"${uploading ? ' enctype="multipart/form-data"' : ''} action="${record.route}/submit">${fields}${upload}<button type="submit">${html(record.submitLabel)}</button></form></body></html>`)
        return
      }
      if (request.method !== 'POST' || request.url !== `${record.route}/submit`) {
        response.statusCode = 405
        response.end('Method refused')
        return
      }
      record.posts++
      let bytes = 0
      const parts = []
      for await (const part of request) {
        bytes += part.length
        assert.ok(bytes <= (uploading ? 2 * 1024 * 1024 : 576032), 'Synthetic form body budget')
        parts.push(part)
      }
      const values = new URLSearchParams(Buffer.concat(parts).toString('utf8'))
      const receivedFiles = uploading ? await readUploads(Buffer.concat(parts), request.headers['content-type'] ?? '', record.fields.map(field => wireText(field.text)), [{ label: record.uploadLabel, files: record.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) }]) : null
      const received = uploading ? record.fields.map(field => wireText(field.text)) : record.fields.map((_, index) => values.get(`field${index}`))
      record.received.push(received)
      const exact = uploading
        ? receivedFiles !== null
        : request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')
          && [...values.keys()].length === record.fields.length
          && record.fields.every((field, index) => values.getAll(`field${index}`).length === 1 && received[index] === wireText(field.text))
      if (!exact || record.posts !== 1) {
        record.refused++
        response.statusCode = 403
        response.end('Owned form refused changed values or duplicate submission')
        return
      }
      record.accepted++
      if (uploading)
        record.receivedFiles.push(receivedFiles)
      const actualValues = record.changed ? received.map((_, index) => `Independent changed value ${index}`) : received
      record.observedText = JSON.stringify({ receipt: record.receiptText, values: actualValues, ...(uploading ? { files: receivedFiles } : {}) })
      response.end(`<html><head><title>Owned receipt</title></head><body><pre>${html(record.observedText)}</pre></body></html>`)
    })().catch((error) => {
      report.interactiveFormFixtureFailure = error.message
      if (!response.headersSent)
        response.statusCode = 500
      response.end('Owned fixture failed')
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  function form(name, changed = false) {
    const fields = [
      { label: `第一栏 ${name} ${randomUUID()}`, text: `第一段 ${name} 中文🙂\n第二行 ${randomUUID()}` },
      { label: `第二栏 ${name} ${randomUUID()}`, text: `第二段 ${name} & <safe>\r\n另一行 ${randomUUID()}` },
    ]
    if (uploading)
      fields.pop()
    const route = `/${nonce}/${name}/form`
    const record = { route, url: origin + route, fields, submitLabel: `记录这次选择 ${name} ${randomUUID()}`, receiptText: `回执 ${name} ${randomUUID()}`, changed, posts: 0, accepted: 0, refused: 0, received: [], observedText: null }
    if (uploading) {
      record.uploadLabel = `本次附件 ${name} ${randomUUID()}`
      record.files = [0, 1].map((index) => {
        const filename = `attachment-${name}-${index}-${randomUUID()}.txt`
        const content = `Exact synthetic attachment ${name}/${index} 中文🙂\r\n${randomUUID()}`
        return { path: path.join(root, filename), name: filename, content, bytes: Buffer.byteLength(content, 'utf8'), sha256: digest(content) }
      })
      record.receivedFiles = []
    }
    const files = uploading ? { files: [record.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))] } : {}
    record.expectedText = JSON.stringify({ receipt: record.receiptText, values: fields.map(field => wireText(field.text)), ...files })
    record.actualText = changed ? JSON.stringify({ receipt: record.receiptText, values: fields.map((_, index) => `Independent changed value ${index}`), ...files }) : record.expectedText
    forms.set(route, record)
    return record
  }
  function proposal(record, goal, target) {
    const steps = []
    function add(id, capabilityId, input, inputBindings) {
      steps.push({ id, capabilityId, input, dependsOn: steps.length ? [steps.at(-1).id] : [], acceptanceCriterionIds: id === 'save' ? ['bytes'] : [], ...(inputBindings ? { inputBindings } : {}) })
    }
    const binding = (stepId, label) => [{ parameter: 'selector', stepId, path: ['elements'], select: { field: 'text', equals: label, valueField: 'selector' } }]
    add('open', 'tool.browser_open_url', { url: record.url })
    record.fields.forEach((field, index) => {
      add(`read-${index}`, 'tool.browser_read_page', { format: 'interactables' })
      add(`fill-${index}`, 'tool.browser_type_text', { selector: 'from-current-observation', text: field.text, clearExisting: true }, binding(`read-${index}`, field.label))
    })
    if (uploading) {
      add('read-upload', 'tool.browser_read_page', { format: 'interactables' })
      add('select-files', 'tool.browser_upload_files', { selector: 'from-current-observation', files: record.files.map(file => file.path) }, binding('read-upload', record.uploadLabel))
    }
    add('read-submit', 'tool.browser_read_page', { format: 'interactables' })
    add('submit', 'tool.browser_click_element', { selector: 'from-current-observation' }, binding('read-submit', record.submitLabel))
    add('wait', 'tool.browser_wait', { state: 'complete', text: record.receiptText, timeoutMs: 10000 })
    add('receipt', 'tool.browser_read_page', { format: 'text' })
    add('save', 'tool.filesystem_write_file', { path: target }, [{ parameter: 'content', stepId: 'receipt', path: ['content'] }])
    return { goal, steps, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: target, sha256: digest(record.expectedText) } }] }
  }
  const task = goal => settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
  async function finish(record, goal, target, successful = true) {
    const item = task(goal)
    const deadline = Date.now() + 60000
    while (Date.now() < deadline) {
      if (!uploading || !await approveOwnedUpload([chat, settings], `${record.url}/submit`, record.files))
        await approveSyntheticOperation([chat, settings], [{ path: target, marker: record.actualText, operation: '创建一个文件' }], undefined, { deferOperations: uploading ? ['browser_upload_files'] : [] })
      if (successful ? await item.getByRole('status').filter({ hasText: '结果已确认' }).isVisible() : await fs.readFile(target, 'utf8').catch(() => null) === record.actualText)
        break
      await wait(200)
    }
    if (successful)
      await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
    assert.equal(await fs.readFile(target, 'utf8'), record.actualText)
    assert.equal(record.posts, 1, 'Exactly one actual POST for each admitted method use')
    assert.equal(record.accepted, 1)
    assert.equal(record.refused, 0)
    assert.deepEqual(record.received, [record.fields.map(field => wireText(field.text))])
    if (uploading)
      assert.deepEqual(record.receivedFiles, [[record.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))]])
    return item
  }
  async function prepareFiles(record) {
    for (const file of record.files ?? []) {
      await fs.writeFile(file.path, file.content, { flag: 'wx' })
      file.path = await fs.realpath(file.path)
    }
  }
  let region
  const versions = async () => new Set(await region.locator('article').evaluateAll(nodes => nodes.map(node => node.dataset.procedureVersion)))
  async function captureSource(record, name, expectedId) {
    const previous = await versions()
    const target = path.join(root, `${name}.txt`)
    const goal = `QA 交互方法来源 ${randomUUID()}`
    await prepareFiles(record)
    await sendExecutionRequest(chat, `请调用 life_execute_work_plan 接受下列完整工作计划。逐项保留 goal、criteria、全部十个 steps、dependsOn 和 inputBindings，尤其是每次实际读取后才能选择控件。网页和文件均属于本次合成测试，不使用直接工具代替计划，不猜 selector，不改写文本与换行。\n${JSON.stringify(proposal(record, goal, target))}`)
    await finish(record, goal, target)
    let fresh = []
    const by = Date.now() + 20000
    while (Date.now() < by) {
      await region.getByRole('button', { name: '刷新方法', exact: true }).click()
      fresh = (await region.locator('article').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.procedureId, version: node.dataset.procedureVersion })))).filter(item => !previous.has(item.version))
      if (fresh.length)
        break
      await wait(250)
    }
    assert.equal(fresh.length, 1, 'One actual successful source must publish one new candidate')
    const candidate = fresh[0]
    if (expectedId)
      assert.equal(candidate.id, expectedId)
    const method = region.locator(`article[data-procedure-id="${candidate.id}"][data-procedure-version="${candidate.version}"]`)
    assert.equal(await method.getByRole('button', { name: '启用', exact: true }).count(), 0)
    await method.getByRole('button', { name: '用不同内容测试', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 60000 })
    assert.ok((await method.innerText()).includes(`${replayCount} / ${replayCount} 项复跑检查通过`))
    if (expectedId) {
      const comparison = method.locator('[data-procedure-comparison]')
      await comparison.waitFor()
      assert.equal(await comparison.getAttribute('data-procedure-comparison-baseline'), report.browserProcedureSource.version)
      assert.ok((await comparison.innerText()).includes('旧版：完成 2/2'))
      assert.ok((await comparison.innerText()).includes('候选：完成 2/2'))
      check('The actual repaired form method displays paired completion and efficiency evidence against its original version', true)
      await capture(settings, 'interactive-repaired-method-version-comparison')
    }
    await method.getByRole('button', { name: '启用', exact: true }).click()
    await method.getByText('已启用', { exact: true }).waitFor()
    await settings.reload()
    await method.getByText('已启用', { exact: true }).waitFor()
    const source = { ...candidate, sourceGoal: goal, sourceUrl: record.url, sourcePath: target, marker: record.actualText, sha256: digest(record.actualText), mtimeMs: (await fs.stat(target)).mtimeMs, fields: record.fields, ...(uploading ? { files: record.files } : {}) }
    check(uploading ? 'Actual dialogue source requires eleven fresh replay cases before enabling its upload method' : 'Actual dialogue source requires ten fresh replay cases before enabling its interactive method', true)
    if (uploading)
      record.windowClosure = await closeOwnedUploadWindow(app, record.url)
    return { ...candidate, method, source }
  }
  async function use(candidate, record, name, successful = true) {
    const target = path.join(root, `${name}.txt`)
    const goal = `QA 交互方法复用 ${randomUUID()}`
    await prepareFiles(record)
    const input = { url: record.url, targetPath: target, expectedSha256: digest(record.expectedText), fields: record.fields, submitLabel: record.submitLabel, waitText: record.receiptText, ...(uploading ? { uploadLabel: record.uploadLabel, files: record.files.map(file => file.path) } : {}) }
    const controls = uploading ? 'step3 的标签与正文用 fields[0]；step5 是附件选择，标签取 uploadLabel，file-list / attachments 参数取 files 数组，禁止变成字符串或从网页猜文件路径。' : 'step3 的标签与正文用 fields[0]，step5 用 fields[1]；'
    await sendExecutionRequest(chat, `请调用 life_list_learned_procedures 找到 id=${candidate.id}、version=${candidate.version} 的已启用方法，再调用 life_use_learned_procedure，goal 必须为 ${goal}。根据公开参数的 kind、role 和 uses 填入下列本次参数。uses 的 stepId 用于配对控件标签与值：${controls}inputBindings.selector.select.equals 是对应控件标签。browser_click_element 的标签取 submitLabel，browser_wait.text 取 waitText，browser_open_url.url 取 url，filesystem_write_file.path 取 targetPath，criterion.sha256 取 expectedSha256。保留所有换行。最终正文只能来自实际网页回执读取，禁止直接写文件或新建计划代替。所有对象均是本次拥有的合成资料。\n${JSON.stringify(input)}`)
    const item = await finish(record, goal, target, successful)
    const entry = { id: candidate.id, version: candidate.version, goal, target, marker: record.actualText, url: `${record.url}/submit`, formUrl: record.url, sha256: digest(record.actualText), requiredHash: digest(record.expectedText), fields: record.fields, posts: record.posts, ...(uploading ? { files: record.files } : {}) }
    if (uploading)
      record.windowClosure = await closeOwnedUploadWindow(app, record.url)
    if (!successful)
      return { ...entry, planId: await item.getAttribute('data-work-plan-id'), obligationId: await item.getAttribute('data-work-obligation-id') }
    const before = await sampleLive2D(stage)
    await wait(150)
    const after = await sampleLive2D(stage)
    check('Actual interactive method submits each distinct form once, saves the observed receipt and keeps Live2D drawing', after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
    await item.scrollIntoViewIfNeeded()
    await capture(settings, name)
    return entry
  }
  try {
    report.format = uploading ? 'life-upload-method-product-v1' : 'life-interactive-form-method-product-v1'
    report.scope = 'Actual packaged model/UI source, ten-case evaluation, activation, three distinct multiline form submissions, wrong receipt downgrade, fresh repaired source/evaluation, three repaired uses and persistent withdrawal. Only nonce-owned loopback pages and explicit new files; no user browser, physical keys, external transmission or generic form-learning claim.'
    if (uploading)
      report.scope = 'Actual packaged model/UI upload source, eleven-case evaluation, exact frozen-snapshot approval, three fresh multipart uploads with independent server byte hashes, wrong-receipt downgrade, fresh repair/evaluation, three repaired uploads and withdrawal. Each exact owned receipt window is closed after use; other application windows remain open. No user browser or external destination.'
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    region = settings.locator('[data-learned-procedures]')
    await region.getByRole('heading', { name: '学习到的方法', exact: true }).waitFor()
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    const original = await captureSource(form('source'), 'interactive-original-source')
    report.browserProcedureSource = original.source
    report.browserProcedureExperiences = []
    for (const round of [1, 2, 3])
      report.browserProcedureExperiences.push(await use(original, form(`fresh-${round}`), `interactive-fresh-${round}`))
    report.browserProcedureFailure = await use(original, form('changed-receipt', true), 'interactive-invalid', false)
    const by = Date.now() + 20000
    while (Date.now() < by && !await original.method.getByText('需要修复并重新评估', { exact: true }).isVisible()) {
      await region.getByRole('button', { name: '刷新方法', exact: true }).click()
      await wait(200)
    }
    await original.method.getByText('需要修复并重新评估', { exact: true }).waitFor({ timeout: 3000 })
    assert.equal(await task(report.browserProcedureFailure.goal).getByRole('status').filter({ hasText: '结果已确认' }).count(), 0)
    assert.equal(await original.method.getByRole('button', { name: '启用', exact: true }).count(), 0)
    await settings.reload()
    await original.method.getByText('需要修复并重新评估', { exact: true }).waitFor()
    check('A real receipt mismatch independently fails the current goal and persistently removes the old method', true)
    const repaired = await captureSource(form('repaired-source'), 'interactive-repaired-source', original.id)
    assert.notEqual(repaired.version, original.version)
    report.browserProcedureRepairSource = { ...repaired.source, previousVersion: original.version }
    report.browserProcedureRepairedExperiences = []
    for (const round of [1, 2, 3])
      report.browserProcedureRepairedExperiences.push(await use(repaired, form(`repaired-${round}`), `interactive-repaired-${round}`))
    await repaired.method.getByRole('button', { name: '停用此版本', exact: true }).click()
    await repaired.method.getByText('来源已失效', { exact: true }).waitFor()
    await settings.reload()
    await repaired.method.getByText('来源已失效', { exact: true }).waitFor()
    assert.equal(await fs.readFile(original.source.sourcePath, 'utf8'), original.source.marker)
    assert.equal((await fs.stat(original.source.sourcePath)).mtimeMs, original.source.mtimeMs)
    report.interactiveFormReceipts = [...forms.values()]
    assert.equal(forms.size, 9)
    assert.ok([...forms.values()].every(item => item.posts === 1 && item.accepted === 1 && item.refused === 0))
    check('Nine independent form submissions remain exact-once, while original source bytes and persistent withdrawal are preserved', true)
  }
  finally {
    report.browserProcedureRequests = requests
    report.interactiveFormReceipts = [...forms.values()]
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}
