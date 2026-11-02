const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const hash = text => createHash('sha256').update(text).digest('hex')

/** Natural-language admission and ordinary UI only; no injected plans or receipts. */
exports.runAdaptiveWorkProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  report.adaptiveWorkExperiences = []
  await stage.evaluate(() => {
    const dispatcher = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('alicization-presence-dispatcher')
    if (!dispatcher)
      throw new Error('Actual presence dispatcher is unavailable')
    window.__adaptiveWorkPulses = []
    window.__adaptiveWorkObserver = dispatcher.$onAction(({ name, args }) => {
      const payload = args[0]
      if (name === 'dispatchPresencePulse' && payload?.activity?.kind === 'execution') {
        window.__adaptiveWorkPulses.push({ at: Date.now(), activity: structuredClone(payload.activity) })
        window.__adaptiveWorkPulses = window.__adaptiveWorkPulses.slice(-64)
      }
    }, true)
  })
  for (const round of [1, 2, 3]) {
    const id = randomUUID()
    const directory = path.join(root, `adaptive-work-${id}`)
    const sourceDirectory = path.join(directory, 'notes')
    await fs.mkdir(sourceDirectory, { recursive: true })
    const source = path.join(sourceDirectory, `actual-note-${randomUUID()}.txt`)
    const missing = path.join(sourceDirectory, 'previous-note-location.txt')
    const preface = path.join(directory, 'preface.txt')
    const destination = path.join(directory, 'result.txt')
    const content = `Actual owned note ${id}\n中文与标点，保持原样。\n`
    const prefaceContent = `Retain this first write ${id}`
    await fs.writeFile(source, content, { flag: 'wx' })
    const sourceMtimeMs = (await fs.stat(source)).mtimeMs
    const goal = `QA 自主修正 ${round} ${id}`
    const request = `请只调用 life_execute_work_plan 建立一个持续任务，目标名称需要包含「${goal}」。按顺序：先新建 ${preface}，内容必须精确为「${prefaceContent}」；列出目录 ${sourceDirectory} 的文件；计划中的下一步先尝试读取候选路径 ${missing}；最后把实际读取到的笔记全文原样保存到新文件 ${destination}。候选位置可能已经过期，读不到时应利用先前真实目录观察自行修正未来读取，再接着完成同一个任务，不要重写开头文件。保存步骤必须用 inputBindings 取读取回执 content 数组中 type=text 的 text，不能把内容写死。验收：结果文件必须与实际源笔记的全文原字节一致，请用 file-matches-read 绑定该源文件读取步骤与结果路径；同时包含 ${id} 与「中文与标点，保持原样。」，开头文件保留原字节。不要在对话中先零散试探工具，不要改用脚本，不要改动源文件，不能在读失败后声称成功。`
    const experience = { round, goal, directory, sourceDirectory, source, missing, preface, destination, content, prefaceContent, sourceMtimeMs, requestSha256: hash(request), requestChars: request.length, comparisonSamples: [], completed: false }
    report.adaptiveWorkExperiences.push(experience)
    const before = await sampleLive2D(stage)
    const observingSince = Date.now()
    await sendExecutionRequest(chat, request)
    const targets = [
      { path: preface, operation: '创建一个文件', marker: prefaceContent },
      { path: sourceDirectory, operation: '读取文件或资料', toolName: 'list_directory', readOptions: ['maxEntries', 'maxReturnBytes', 'recursive'] },
      { path: missing, operation: '读取文件或资料', readOptions: ['maxReturnBytes'] },
      { path: source, operation: '读取文件或资料', readOptions: ['maxReturnBytes'] },
      { path: destination, operation: '创建一个文件', marker: content },
    ]
    const deadline = Date.now() + 180000
    let actual
    let firstPrefaceMtimeMs
    while (Date.now() < deadline) {
      await approveSyntheticOperation([chat, settings], targets)
      if (experience.comparisonSamples.length < 2) {
        const pulse = await stage.evaluate(since => window.__adaptiveWorkPulses?.findLast(item => item.at >= since), observingSince)
        if (pulse?.activity?.phase === 'working' && pulse.activity.work?.mode === 'comparing') {
          const frame = await sampleLive2D(stage)
          const first = experience.comparisonSamples[0]
          if (!first || frame.at - first.frame.at >= 150) {
            experience.comparisonSamples.push({ pulse, frame })
            if (experience.comparisonSamples.length === 2)
              await capture(stage, `adaptive-work-${round}-comparing`)
          }
        }
      }
      firstPrefaceMtimeMs ??= await fs.stat(preface).then(info => info.mtimeMs, () => undefined)
      actual = await fs.readFile(destination, 'utf8').catch(() => null)
      if (actual === content)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    check('The actual model and product resume the original task after a missing candidate read', actual === content, { round, goal, actualHash: actual == null ? null : hash(actual) })
    check('The committed comparison reaches actual Live2D drawing during model repair', experience.comparisonSamples.length === 2 && experience.comparisonSamples[1].frame.models[0]?.drawFrame?.frame > experience.comparisonSamples[0].frame.models[0]?.drawFrame?.frame, { round })
    assert.equal(await fs.readFile(preface, 'utf8'), prefaceContent)
    assert.equal((await fs.stat(preface)).mtimeMs, firstPrefaceMtimeMs)
    assert.equal(await fs.readFile(source, 'utf8'), content)
    assert.equal((await fs.stat(source)).mtimeMs, sourceMtimeMs)
    check('Read repair preserves both the source and the first completed write', true, { round })
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    const item = settings.locator('article[data-work-plan-id]').filter({ hasText: goal })
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
    experience.planId = await item.getAttribute('data-work-plan-id')
    experience.obligationId = await item.getAttribute('data-work-obligation-id')
    await capture(settings, `adaptive-work-${round}-verified`)
    let after = await sampleLive2D(stage)
    // An actual streamed acknowledgement may still be articulating its final
    // words when work ends. Require a bounded return to silence afterwards.
    for (let attempt = 0; attempt < 80 && after.models[0]?.diagnostics?.activeLipSync?.active; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      after = await sampleLive2D(stage)
    }
    check('Live2D continues drawing and has no active silent-work lip sync at completion', after.models.length === 1 && after.models[0].drawFrame?.frame > (before.models[0]?.drawFrame?.frame ?? 0) && after.models[0].diagnostics?.activeLipSync?.active === false, { round })
    await settings.reload()
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
    check('Reload retains the same independently fulfilled responsibility after replanning', await item.getAttribute('data-work-obligation-id') === experience.obligationId, { round })
    experience.completed = true
  }
}
