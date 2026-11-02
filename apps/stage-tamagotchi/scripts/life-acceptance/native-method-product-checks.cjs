/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify visible product states. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')
const { runNativeMenuProductChecks } = require('./native-menu-product-checks.cjs')
const { startNativeMethodFixture } = require('./native-method-fixture.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const sha = value => createHash('sha256').update(value).digest('hex')

exports.runNativeMethodProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  report.nativeMethodExperiences = []
  report.nativeMethodFixtureClosures = []
  let fixture
  async function next(label) {
    if (fixture) {
      report.nativeMethodFixtureClosures.push(await fixture.close())
      fixture = null
    }
    fixture = await startNativeMethodFixture(path.join(root, `native-method-${label}`), `Save owned ${label}`)
    check('Native method fixture is independently identified outside every display without focus', fixture.outsideAllDisplays && !fixture.foreground, { processId: fixture.processId, windowId: fixture.windowId, processStartTicks: fixture.processStartTicks, sourceSha256: fixture.sourceSha256 })
    return fixture
  }
  const region = settings.locator('[data-learned-procedures]')
  async function delivered(goal, current, text) {
    const work = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
    const deadline = Date.now() + 100_000
    while (Date.now() < deadline && !await work.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) await wait(200)
    await work.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 1000 })
    const state = await current.read()
    const bytes = await fs.readFile(current.targetPath)
    check('Actual model native method saves exactly once with independently matched UTF-8 bytes', state.saves === 1 && state.content === text && bytes.equals(Buffer.from(text, 'utf8')), { goal, sha256: sha(bytes), bytes: bytes.length, saves: state.saves })
    const before = await sampleLive2D(stage)
    await wait(180)
    const after = await sampleLive2D(stage)
    check('Actual Live2D continues drawing throughout native method delivery', before.models.length === 1 && after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
    await work.scrollIntoViewIfNeeded()
    await capture(settings, `native-method-${report.nativeMethodExperiences.length}-delivery`)
    report.nativeMethodExperiences.push({ goal, targetPath: current.targetPath, text, sha256: sha(bytes), saves: state.saves, processId: current.processId, windowId: current.windowId, windowTitle: current.windowTitle, saveLabel: current.saveLabel })
  }
  try {
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    await runNativeMenuProductChecks({ settings, chat, stage, root, report, capture, check })
    const source = await next('original')
    const text = 'Owned native method 中文🙂 original'
    const goal = `QA 原生方法源任务 ${randomUUID()}`
    const read = (id, dependsOn) => ({ id, capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: source.windowTitle, maxItems: 40 }, dependsOn, acceptanceCriterionIds: [] })
    const proposal = { goal, criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: source.targetPath, sha256: sha(text) } }], steps: [read('read-entry', []), { id: 'type', capabilityId: 'tool.desktop_type_text', input: { windowTitle: source.windowTitle, text, clearExisting: true, role: 'input', exactText: true }, inputBindings: [{ parameter: 'role', stepId: 'read-entry', path: ['elements'], select: { field: 'role', equals: 'input', valueField: 'role' } }], dependsOn: ['read-entry'], acceptanceCriterionIds: [] }, read('read-save', ['type']), { id: 'save', capabilityId: 'tool.desktop_click_element', input: { windowTitle: source.windowTitle, text: source.saveLabel, role: 'button', exactText: true }, inputBindings: [{ parameter: 'text', stepId: 'read-save', path: ['elements'], select: { field: 'name', equals: source.saveLabel, valueField: 'name' } }], dependsOn: ['read-save'], acceptanceCriterionIds: ['bytes'] }] }
    await sendExecutionRequest(chat, `请调用 life_execute_work_plan，原样提交以下四步计划，只操作明确指定的自有测试编辑器；逐次使用当前控件观察，不能改用文件或代码工具代替输入和保存，不能省略独立字节验收：${JSON.stringify(proposal)}`)
    await delivered(goal, source, text)
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline && !await region.locator('article').count()) {
      await region.getByRole('button', { name: '刷新方法', exact: true }).click()
      await wait(200)
    }
    const first = region.locator('article').first()
    await first.waitFor()
    const id = await first.getAttribute('data-procedure-id')
    const version = await first.getAttribute('data-procedure-version')
    assert.match(id, /^skill\.learned_[a-f0-9]{24}$/)
    assert.match(version, /^[a-f0-9]{64}$/)
    const item = region.locator(`article[data-procedure-id="${id}"][data-procedure-version="${version}"]`)
    check('Actual completed native task produces a nonactive method candidate', await item.getByText('待启用', { exact: true }).isVisible())
    await item.getByRole('button', { name: '用不同内容测试', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '测试通过，可以启用此方法。' }).waitFor({ timeout: 180_000 })
    check('Packaged native method evaluator completes ten real changed-input and failure checks', (await item.innerText()).includes('10 / 10 项复跑检查通过'))
    await item.getByRole('button', { name: '启用', exact: true }).click()
    await item.getByText('已启用', { exact: true }).waitFor()
    await settings.reload()
    await item.getByText('已启用', { exact: true }).waitFor({ timeout: 15_000 })
    check('Native method activation survives actual product reload', true)
    for (const [round, literal] of ['Fresh 中文🙂\r\nLiteral $(Get-Process)', 'العربية e\u0301\nSecond LF line', 'Third 👩‍👩‍👧‍👦 "quoted"'].entries()) {
      const target = await next(`reuse-${round}`)
      const mapping = { windowTitle: target.windowTitle, saveLabel: target.saveLabel, targetPath: target.targetPath, text: literal }
      const goal = `QA 原生方法复用 ${round} ${randomUUID()}`
      await sendExecutionRequest(chat, `请先调用 life_list_learned_procedures，找到已启用方法 id=${id} version=${version}。本次编辑器参数：${JSON.stringify(mapping)}。按参数用途填写当前窗口、按钮、文字和文件，调用 life_use_learned_procedure，goal 必须为 ${goal}。保留文字全部换行和字符，禁止以文件工具或代码绕过真实编辑器。`)
      await delivered(goal, target, literal)
    }
    await item.getByRole('button', { name: '停用此版本', exact: true }).click()
    await item.getByText('来源已失效', { exact: true }).waitFor({ timeout: 10_000 })
    await settings.reload()
    await item.getByText('来源已失效', { exact: true }).waitFor({ timeout: 10_000 })
    check('Native method revocation persists and the prior saved file stays unchanged', (await fixture.read()).saves === 1 && report.nativeMethodExperiences.length === 4)
    report.nativeMethodIdentity = { id, version, source: 'actual-configured-model-and-packaged-live2d-product', keyboardInjectionUsed: false, arbitraryDesktopWorkflowAccepted: false }
  }
  finally {
    if (fixture)
      report.nativeMethodFixtureClosures.push(await fixture.close())
  }
}
