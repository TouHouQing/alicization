/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify visible product advice. */
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')
const { startNativeMenuFixture } = require('./native-method-fixture.cjs')

exports.runNativeMenuProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  const fixture = await startNativeMenuFixture(path.join(root, 'native-passive-menu'))
  report.nativeMenuExperiences = []
  try {
    check('Real owned WPF menu starts outside every display without focus', fixture.outsideAllDisplays && !fixture.foreground, { nonce: fixture.nonce, processId: fixture.processId, windowId: fixture.windowId, processStartTicks: fixture.processStartTicks, fixtureSourceSha256: fixture.fixtureSourceSha256 })
    for (const [round, target] of ['bound', 'literal', 'bound'].entries()) {
      const goal = `QA 原生菜单前台条件 ${round} ${randomUUID()}`
      const proposal = { goal, criteria: [{ id: 'marker', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: fixture.marker, sha256: fixture.markerSha256 } }], steps: [
        { id: 'read', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: fixture.windowTitle, maxItems: 120 }, dependsOn: [], acceptanceCriterionIds: [] },
        { id: 'menu', capabilityId: 'tool.desktop_click_element', input: { windowTitle: fixture.windowTitle, text: target === 'literal' ? 'Owned file options' : '@current', role: 'menu-item', exactText: true }, ...(target === 'bound' ? { inputBindings: [{ parameter: 'text', stepId: 'read', path: ['elements'], select: { field: 'name', equals: 'Owned file options', valueField: 'name' } }] } : {}), dependsOn: ['read'], acceptanceCriterionIds: ['marker'] },
      ] }
      await sendExecutionRequest(chat, `请调用 life_execute_work_plan，原样提交以下两步自有原生菜单计划。只允许读取控件与点击指定菜单，必须保留独立字节验收；禁止直接写文件、调用代码或获取前台焦点。若前台条件不足，说明等待用户处理，不得声称菜单已经点击或任务完成：${JSON.stringify(proposal)}`)
      const work = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
      const hint = work.locator('[data-work-blocker="foreground-required"]')
      await hint.waitFor({ timeout: 100000 })
      const planId = await work.getAttribute('data-work-plan-id')
      const obligationId = await work.getAttribute('data-work-obligation-id')
      assert.ok(planId && obligationId)
      assert.equal(await work.getAttribute('data-work-plan-revision'), '1')
      check('Native foreground refusal explains rechecking and has no success claim', (await hint.innerText()).includes('目标窗口保持前台') && (await hint.innerText()).includes('否则保持暂停') && !await work.getByRole('status').filter({ hasText: '结果已确认' }).count())
      const recheck = work.locator('[data-work-resume]')
      check('Native recheck button describes the actual next action', await recheck.innerText() === '重新检查窗口')
      await recheck.click()
      await settings.waitForFunction(({ id }) => document.querySelector(`[data-work-plan-id="${CSS.escape(id)}"]`)?.getAttribute('data-work-plan-revision') === '2', { id: planId }, { timeout: 20000 })
      await hint.waitFor({ timeout: 20000 })
      const state = await fixture.read()
      assert.deepEqual(state, { nonce: fixture.nonce, clicks: 0, submenuOpen: false, actionVisible: false, foregroundTaken: false })
      await assert.rejects(fs.readFile(fixture.marker), { code: 'ENOENT' })
      check('Actual host Continue refreshes the same native window and refuses again without activation', true, { round, target, planId, obligationId, revision: 2, state })
      const before = await sampleLive2D(stage)
      await settings.waitForTimeout(180)
      const after = await sampleLive2D(stage)
      check('Live2D remains rendered while the native responsibility is waiting', before.models.length === 1 && after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
      await work.scrollIntoViewIfNeeded()
      await capture(settings, `native-menu-${round}-foreground-advice`)
      await work.getByRole('button', { name: '停止任务', exact: true }).click()
      await work.getByRole('status').filter({ hasText: '已取消' }).waitFor({ timeout: 10000 })
      check('Stopping the refused native task preserves cancellation without an effect or success', !await work.getByRole('status').filter({ hasText: '结果已确认' }).count())
      report.nativeMenuExperiences.push({ goal, planId, obligationId, windowTitle: fixture.windowTitle, marker: fixture.marker, target, revision: 2, nonce: fixture.nonce, foregroundTaken: false })
    }
  }
  finally {
    report.nativeMenuFixtureClosure = await fixture.close()
    check('Passive native menu fixture exits normally with its native Job tree stopped', report.nativeMenuFixtureClosure.normalExit && report.nativeMenuFixtureClosure.nativeJobTreeStopped)
  }
}
