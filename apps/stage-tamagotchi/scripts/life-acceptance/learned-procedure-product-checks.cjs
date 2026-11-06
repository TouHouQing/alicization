/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify actual visible result controls. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

exports.runLearnedProcedureProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
  const region = settings.locator('[data-learned-procedures]')
  await region.getByRole('heading', { name: '学习到的方法', exact: true }).waitFor()
  const deadline = Date.now() + 15000
  while (Date.now() < deadline && !await region.locator('article').count()) {
    await region.getByRole('button', { name: '刷新方法', exact: true }).click()
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  const first = region.locator('article').first()
  await first.waitFor()
  const id = await first.getAttribute('data-procedure-id')
  const version = await first.getAttribute('data-procedure-version')
  assert.match(id, /^skill\.learned_[a-f0-9]{24}$/)
  assert.match(version, /^[a-f0-9]{64}$/)
  // Successful reuse can insert a newer candidate. Follow the original tested
  // version through refresh/reload instead of silently retargeting its row.
  const item = region.locator(`article[data-procedure-id="${id}"][data-procedure-version="${version}"]`)
  check('An independently completed real task becomes a nonactive procedure candidate', await item.getByText('待启用', { exact: true }).isVisible())
  await item.getByRole('button', { name: '用不同内容测试', exact: true }).click()
  await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 45000 })
  check('Actual product evaluation runs both changed-input cases and counterexamples', (await item.innerText()).includes('5 / 5 项复跑检查通过'))
  await item.getByRole('button', { name: '启用', exact: true }).click()
  await item.getByText('已启用', { exact: true }).waitFor()
  await item.scrollIntoViewIfNeeded()
  await capture(settings, 'learned-method-enabled')
  await settings.reload()
  await item.getByText('已启用', { exact: true }).waitFor({ timeout: 15000 })
  check('Reload preserves independently tested method activation', true)
  report.learnedProcedureExperiences = []
  for (let round = 1; round <= 3; round++) {
    const marker = `Fresh learned request ${round} ${randomUUID()} 中文🙂`
    // The run directory is already unique. Keep fixture names readable while
    // retaining exact path/content checks at the actual permission dialog.
    const target = path.join(root, `learned-output-${round}.txt`)
    const source = path.join(root, `learned-input-${round}.txt`)
    await fs.writeFile(source, 'An explicitly authorized new synthetic source, not an original private file.', { flag: 'wx' })
    const goal = `QA 学习方法复用 ${randomUUID()}`
    const workRegion = settings.getByRole('region', { name: '工作进展', exact: true })
    const previousPlans = await workRegion.locator('article[data-work-plan-id]').evaluateAll(nodes => nodes.map(node => node.dataset.workPlanId))
    const autonomous = process.env.LIFE_PRODUCT_AUTONOMOUS_METHOD_ONLY === '1'
    const prompt = autonomous
      ? `请完成一项名为“${goal}”的本地工作：读取 ${source}，并在新文件 ${target} 中原样写入 ${JSON.stringify(marker)}。只允许操作这两个文件，请使用你已经掌握并且适合这项工作的做法，并在工作进展中保留可验收的结果。`
      : `请先调用 life_list_learned_procedures，找到 id=${id}、version=${version} 的已启用方法；按参数 uses 中的 operation 和 field 对应填写：write_file 的 path=${target}、content=${JSON.stringify(marker)}；read_file 的 path=${source}。调用 life_use_learned_procedure，goal 必须为 ${goal}。只允许操作这两个测试文件，不用单独文件工具代替，不要重新创建计划，不要只口头声称执行。`
    await sendExecutionRequest(chat, prompt)
    // Follow the new durable plan identity. A model may paraphrase the display
    // title, which must not silently retarget the acceptance to an older task.
    await settings.waitForFunction(before => [...document.querySelectorAll('article[data-work-plan-id]')].some(node => !before.includes(node.dataset.workPlanId)), previousPlans, { timeout: 15000 })
    const newPlans = await workRegion.locator('article[data-work-plan-id]').evaluateAll((nodes, before) => nodes.map(node => node.dataset.workPlanId).filter(id => !before.includes(id)), previousPlans)
    assert.equal(newPlans.length, 1, 'One new request must create one new owned work plan')
    const planId = newPlans[0]
    const work = workRegion.locator(`article[data-work-plan-id="${planId}"]`)
    const finishBy = Date.now() + 45000
    while (Date.now() < finishBy && !await work.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) {
      await approveSyntheticOperation([chat, settings], [{ path: target, marker, bytes: Buffer.byteLength(marker), operation: '创建一个文件' }, { path: source, operation: '读取文件或资料' }])
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    await work.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 3000 })
    check('Actual configured model reuses a learned method with new files and content', await fs.readFile(target, 'utf8') === marker)
    const body = await sampleLive2D(stage)
    await stage.waitForTimeout(150)
    const after = await sampleLive2D(stage)
    check('Learned execution keeps an actual Live2D model drawing', body.models.length === 1 && after.models.length === 1 && after.models[0].parameterSampling === 'final-draw' && after.models[0].drawFrame.frame > (body.models[0].drawFrame?.frame ?? 0))
    await work.scrollIntoViewIfNeeded()
    await capture(settings, `learned-method-delivery-${round}`)
    report.learnedProcedureExperiences.push({ id, version, round, goal, planId, target, inputPath: source, marker, source: 'actual-product-evaluation-activation-model-reuse-and-revocation', autonomousMethodSelection: autonomous, prompt })
  }
  await item.getByRole('button', { name: '停用此版本', exact: true }).click()
  await item.getByText('来源已失效', { exact: true }).waitFor({ timeout: 10000 })
  await settings.reload()
  await item.getByText('来源已失效', { exact: true }).waitFor({ timeout: 10000 })
  check('Real product revocation survives reload and removes the method from use', true)
  check('The same activated method independently delivers three different requests', report.learnedProcedureExperiences.length === 3 && new Set(report.learnedProcedureExperiences.map(item => item.marker)).size === 3)
}
