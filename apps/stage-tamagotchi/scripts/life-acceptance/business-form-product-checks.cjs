const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { existsSync } = require('node:fs')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const { chromium } = require('playwright')

const { startBusinessFormFixture } = require('./business-form-fixture.cjs')
const { approveBusinessOperation } = require('./business-form-review.cjs')
const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const hash = value => createHash('sha256').update(value).digest('hex')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

exports.runBusinessFormProductChecks = async function ({ settings, chat, stage, root, report, capture, check, click }) {
  const service = await startBusinessFormFixture(root)
  const browserProfile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-business-browser-'))
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  let browser
  report.businessFormExperiences = []
  try {
    browser = await chromium.launchPersistentContext(browserProfile, { ...(executablePath ? { executablePath } : {}), headless: true, args: ['--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0'], timeout: 15000 })
    const original = browser.pages()[0]
    const [port] = (await fs.readFile(path.join(browserProfile, 'DevToolsActivePort'), 'utf8')).split('\n')
    const cwd = await fs.realpath(root)
    for (const round of [1, 2, 3]) {
      const marker = `Owned business form ${round} 中文🙂 ${randomUUID()}`
      const owned = await service.allocate(round, marker)
      const attachmentSha256 = hash(owned.attachmentBytes)
      const exportSha256 = hash(owned.exportBytes)
      const unauthenticated = await fetch(`${service.origin}/case/${round}`)
      assert.equal(unauthenticated.status, 401)
      await unauthenticated.body.cancel()
      const premature = await fetch(owned.exportUrl)
      assert.equal(premature.status, 409)
      await premature.body.cancel()
      await original.goto(`${service.origin}/login/${round}`)
      await original.frameLocator('#details').getByLabel('QA 附件', { exact: true }).waitFor()
      await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
      const controls = settings.locator('[data-authorized-browser]')
      const details = controls.locator('details')
      if (!await details.evaluate(node => node.open))
        await click(details.locator('summary'))
      await controls.locator('input#authorized-browser-endpoint').fill(`http://127.0.0.1:${port}`)
      await click(controls.locator('[data-browser-inspect]'))
      await click(controls.locator('[data-browser-tab]').filter({ hasText: `Alicization business form ${round}` }))
      await controls.locator('input#authorized-browser-origins').fill(service.origin)
      await click(controls.locator('[data-browser-grant]'))
      await controls.locator('[data-browser-access-status][data-status="connected"]').waitFor({ timeout: 15000 })
      check('The real UI grants only the selected authenticated business page and origin', true, { round })
      const script = `const fs=require('node:fs');(async()=>{const url=new URL(${JSON.stringify(owned.exportUrl)});if(url.origin!==${JSON.stringify(service.origin)}||url.pathname!==${JSON.stringify(`/export/${round}`)})throw Error('Owned export target mismatch');const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Actual service export unavailable');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>65536)throw Error('Owned export exceeds bound');fs.writeFileSync(${JSON.stringify(owned.exportPath)},bytes,{flag:'wx'});process.stdout.write(JSON.stringify({downloaded:true,bytes:bytes.length}));})().catch(()=>{process.exitCode=1;});`
      const cliInput = { command: 'node', args: ['-e', script], cwd, effect: 'mutate' }
      const read = (id, dependency) => ({ id, capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, dependsOn: dependency ? [dependency] : [], acceptanceCriterionIds: [] })
      const binding = (stepId, text) => [{ parameter: 'selector', stepId, path: ['elements'], select: { field: 'text', equals: text, valueField: 'selector' } }]
      const goal = `QA 综合业务表单 ${round} ${randomUUID()}`
      const proposal = {
        goal,
        criteria: [
          { id: 'service-receipt', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: owned.receiptPath, includes: [marker, 'illustration', attachmentSha256, exportSha256] } },
          { id: 'export-bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: owned.exportPath, sha256: exportSha256 } },
        ],
        steps: [
          read('read-note'),
          { id: 'fill-note', capabilityId: 'tool.browser_type_text', input: { selector: 'from-read-note', text: marker, clearExisting: true }, inputBindings: binding('read-note', 'QA 浏览器留言'), dependsOn: ['read-note'], acceptanceCriterionIds: [] },
          read('read-category', 'fill-note'),
          { id: 'select-category', capabilityId: 'tool.browser_type_text', input: { selector: 'from-read-category', text: '绘画', clearExisting: true }, inputBindings: binding('read-category', 'QA 交付分类'), dependsOn: ['read-category'], acceptanceCriterionIds: [] },
          read('read-attachment', 'select-category'),
          { id: 'select-attachment', capabilityId: 'tool.browser_upload_files', input: { selector: 'from-read-attachment', files: [owned.attachmentPath] }, inputBindings: binding('read-attachment', 'QA 附件'), dependsOn: ['read-attachment'], acceptanceCriterionIds: [] },
          read('read-submit', 'select-attachment'),
          { id: 'submit', capabilityId: 'tool.browser_click_element', input: { selector: 'from-read-submit' }, inputBindings: binding('read-submit', '提交业务表单'), dependsOn: ['read-submit'], acceptanceCriterionIds: ['service-receipt'] },
          { id: 'wait-receipt', capabilityId: 'tool.browser_wait', input: { text: '业务已接收，回执已保存', state: 'complete', timeoutMs: 15000 }, dependsOn: ['submit'], acceptanceCriterionIds: [] },
          { id: 'read-result', capabilityId: 'tool.browser_read_page', input: { format: 'text' }, dependsOn: ['wait-receipt'], acceptanceCriterionIds: [] },
          { id: 'download-export', capabilityId: 'coding_agent.cli', input: cliInput, dependsOn: ['read-result'], acceptanceCriterionIds: ['export-bytes'] },
        ],
      }
      const experience = { round, goal, attachmentPath: owned.attachmentPath, attachmentName: owned.attachmentName, attachmentBytes: owned.attachmentBytes.length, attachmentSha256, attachmentMtimeMs: owned.attachmentMtimeMs, marker, receiptPath: owned.receiptPath, receiptId: owned.receiptId, exportPath: owned.exportPath, exportSha256, exportBytes: owned.exportBytes.length, cliInput, approvals: [], foreignText: service.foreignText, completed: false }
      report.businessFormExperiences.push(experience)
      const before = await sampleLive2D(stage)
      await sendExecutionRequest(chat, `请仅调用 life_execute_work_plan 原样接受下面已授权的综合业务计划。使用设置里已登录的原浏览器，通过真实控件填写留言、iframe下拉框和附件。服务端必须实际收到字段与附件字节才会产生回执，随后由明确授权的只读HTTP导出请求下载到新文件；导出不复制原浏览器Cookie，不得用直接文件工具伪造任何产物。参数：${JSON.stringify(proposal)}`)
      const task = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
      const deadline = Date.now() + 150000
      while (Date.now() < deadline) {
        const approved = await approveBusinessOperation([chat, settings], original, { round, marker, destination: `${service.origin}/save/${round}`, attachmentPath: owned.attachmentPath, attachmentName: owned.attachmentName, attachmentBytes: owned.attachmentBytes.length, attachmentSha256, cliInput })
        if (approved)
          experience.approvals.push(approved)
        if (await task.getByRole('status').filter({ hasText: '结果已确认' }).isVisible())
          break
        await wait(120)
      }
      await task.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 2000 })
      experience.planId = await task.getAttribute('data-work-plan-id')
      experience.obligationId = await task.getAttribute('data-work-obligation-id')
      const receipt = JSON.parse(await fs.readFile(owned.receiptPath, 'utf8'))
      assert.deepEqual(receipt, { receiptId: owned.receiptId, round, note: marker, category: 'illustration', attachmentName: owned.attachmentName, attachmentBytes: owned.attachmentBytes.length, attachmentSha256, exportSha256 })
      assert.deepEqual(await fs.readFile(owned.exportPath), owned.exportBytes)
      assert.deepEqual(await fs.readFile(owned.attachmentPath), owned.attachmentBytes)
      assert.equal((await fs.stat(owned.attachmentPath)).mtimeMs, owned.attachmentMtimeMs)
      const current = service.snapshot()
      assert.deepEqual(current.cases.find(item => item.round === round), { round, submissions: 1, exports: 1, rejected: 0, receipt })
      const exports = current.requests.filter(request => request.path === `/export/${round}` && request.status === 200)
      assert.equal(exports.length, 1)
      assert.equal(exports[0].credentialPresent, false)
      assert.deepEqual(experience.approvals.map(item => item.operation).sort(), ['browser_click_element', 'browser_type_text', 'browser_type_text', 'browser_upload_files', 'coding_agent.cli'].sort())
      assert.equal(new Set(experience.approvals.map(item => item.requestId)).size, 5)
      check('Actual iframe selection, uploaded bytes, one server submission and exported file independently agree', true, { round, steps: proposal.steps.length })
      await settings.reload()
      await task.getByRole('status').filter({ hasText: '结果已确认' }).waitFor()
      await capture(settings, `business-form-${round}-verified`)
      const after = await sampleLive2D(stage)
      check('The business workflow keeps actual Live2D drawing and preserves its source attachment', after.models.length === 1 && after.models[0].drawFrame?.frame > (before.models[0]?.drawFrame?.frame ?? 0), { round })
      await click(controls.locator('[data-browser-revoke]'))
      await controls.locator('[data-browser-access-status][data-status="disconnected"]').waitFor({ timeout: 15000 })
      experience.completed = true
    }
    report.businessFormService = service.snapshot()
    report.businessBrowserProfileCopied = false
  }
  finally {
    await browser?.close()
    await service.close()
  }
}
