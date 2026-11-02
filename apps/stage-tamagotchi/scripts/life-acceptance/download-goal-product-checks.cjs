/* eslint-disable unicorn/prefer-dom-node-text-content -- Observe real rendered work controls. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const { createServer } = require('node:http')

const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

exports.runDownloadGoalProductChecks = async function ({ settings, chat, stage, report, capture, check }) {
  await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
  const payload = `Owned download ${randomUUID()} 中文🙂`
  const sha256 = createHash('sha256').update(payload).digest('hex')
  const downloads = []
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (url.pathname === '/report') {
      const round = Number(url.searchParams.get('round'))
      downloads.push(round)
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': `attachment; filename="download-report-${round}.txt"`, 'content-length': String(Buffer.byteLength(payload)) })
      response.write(Buffer.from(payload).subarray(0, 3))
      const timer = setTimeout(() => response.end(Buffer.from(payload).subarray(3)), 1500)
      response.once('close', () => clearTimeout(timer))
    }
    else {
      const round = Number(url.searchParams.get('round'))
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(`<h1>本地报告下载</h1><a href="/report?round=${round}">下载报告</a>`)
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  report.downloadGoalExperiences = []
  try {
    for (let round = 1; round <= 3; round++) {
      const goal = `QA 下载目标 ${round} ${randomUUID()}`
      const criteria = [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'download', minimumBytes: 1, sha256: round === 3 ? '0'.repeat(64) : sha256 } }]
      if (round === 2)
        criteria.push({ id: 'host-review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '下载的这份报告符合要求吗？', artifactIds: ['download'] } })
      const plan = { goal, criteria, steps: [
        { id: 'open', dependsOn: [], capabilityId: 'tool.browser_open_url', input: { url: `${origin}/?round=${round}` }, acceptanceCriterionIds: [] },
        { id: 'observe', dependsOn: ['open'], capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, acceptanceCriterionIds: [] },
        { id: 'download', dependsOn: ['observe'], capabilityId: 'tool.browser_click_element', input: { selector: 'needs-current-observation' }, inputBindings: [{ parameter: 'selector', stepId: 'observe', path: ['elements'], select: { field: 'text', equals: '下载报告', valueField: 'selector' } }], acceptanceCriterionIds: ['download'] },
      ] }
      await sendExecutionRequest(chat, `请使用 life_execute_work_plan 执行这份受管浏览器下载计划，逐项沿用参数。只访问这台本机测试服务器；下载回执不能代替主观确认。不要使用独立文件工具，不要额外点击。参数：${JSON.stringify(plan)}`)
      const item = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
      await item.waitFor({ timeout: 15000 })
      const planId = await item.getAttribute('data-work-plan-id')
      const obligationId = await item.getAttribute('data-work-obligation-id')
      if (round === 3) {
        await item.getByRole('button', { name: '修改验收要求', exact: true }).waitFor({ timeout: 30000 })
        check('A real native download with the wrong requested hash cannot fulfil its goal', !(await item.innerText()).includes('结果已确认'))
        await item.getByRole('button', { name: '修改验收要求', exact: true }).click()
        const form = item.getByRole('form', { name: '修改验收要求', exact: true })
        await form.getByLabel('预期文件 SHA-256（可选）', { exact: true }).fill(sha256)
        const originalContractHash = await item.getAttribute('data-work-contract-hash')
        const revisionDeadline = Date.now() + 10000
        await form.getByRole('button', { name: '保存新要求', exact: true }).click()
        await form.waitFor({ state: 'hidden', timeout: Math.max(1, revisionDeadline - Date.now()) })
        // Closing the editor can precede the refreshed plan projection. Wait
        // for this exact task's new contract within the original save budget.
        await settings.waitForFunction(({ planId, obligationId, originalContractHash }) => {
          const current = [...document.querySelectorAll('article[data-work-plan-id]')].find(node => node.getAttribute('data-work-plan-id') === planId)
          return current?.getAttribute('data-work-obligation-id') === obligationId
            && current.getAttribute('data-work-generation') === '2'
            && current.getAttribute('data-work-plan-revision') === '2'
            && current.getAttribute('data-work-contract-hash') !== originalContractHash
        }, { planId, obligationId, originalContractHash }, { timeout: Math.max(1, revisionDeadline - Date.now()) })
        assert.equal(await item.getAttribute('data-work-obligation-id'), obligationId)
        assert.equal(await item.getAttribute('data-work-plan-revision'), '2')
        await item.getByRole('button', { name: '继续处理', exact: true }).click()
      }
      if (round === 2) {
        await item.getByRole('button', { name: `打开 download-report-${round}.txt`, exact: true }).waitFor({ timeout: 30000 })
        check('Verified download bytes expose the actual artifact and keep subjective approval pending', !(await item.innerText()).includes('结果已确认'))
        await item.getByRole('button', { name: '我确认结果符合要求', exact: true }).click()
      }
      await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
      await item.getByRole('button', { name: `打开 download-report-${round}.txt`, exact: true }).waitFor()
      assert.equal(downloads.filter(value => value === round).length, 1, 'Verifying or revising requirements must never repeat the actual download')
      check(`Download round ${round} closes the actual responsibility with one network transfer`, true)
      const before = await sampleLive2D(stage)
      await stage.waitForTimeout(150)
      const after = await sampleLive2D(stage)
      check(`Download round ${round} retains the real Live2D model and final draws`, before.models.length === 1 && after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
      await item.scrollIntoViewIfNeeded()
      await capture(settings, `download-goal-${round}-complete`)
      report.downloadGoalExperiences.push({ round, goal, planId, obligationId, expectedHash: sha256, bytes: Buffer.byteLength(payload), hostReviewed: round === 2, criteriaRevised: round === 3, networkTransfers: 1, openScope: 'button-present-no-external-application-launched' })
      await settings.reload()
      await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 15000 })
    }
  }
  finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}
