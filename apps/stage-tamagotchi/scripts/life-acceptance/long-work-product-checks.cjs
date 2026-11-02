const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const hash = text => createHash('sha256').update(text).digest('hex')

/** Actual model admission and UI; the controller only creates its source fixtures. */
exports.runLongWorkProductChecks = async function ({ settings, chat, stage, root, report, capture, check }) {
  assert.equal(report.rendererFocus, 'live2d')
  report.longWorkExperiences ??= []
  for (const round of [1, 2, 3]) {
    const directory = path.join(root, `long-work-${randomUUID()}`)
    await Promise.all(['source', 'odd', 'even'].map(name => fs.mkdir(path.join(directory, name), { recursive: true })))
    const goal = `QA 长任务分类 ${round} ${randomUUID()}`
    const files = Array.from({ length: 10 }, (_, index) => ({
      source: path.join(directory, 'source', `source-${index}.txt`),
      target: path.join(directory, index % 2 ? 'odd' : 'even', `copy-${index}.txt`),
      content: `Owned source ${round}/${index} 中文🙂\n${index % 2 ? 'odd' : 'even'}\n`,
    }))
    for (const file of files) {
      await fs.writeFile(file.source, file.content, { flag: 'wx' })
      file.sourceMtimeMs = (await fs.stat(file.source)).mtimeMs
    }
    const indexPath = path.join(directory, 'index.md')
    const indexText = `# Classified files\n${files.map((file, index) => `- [${index}](${file.target.replaceAll('\\', '/')})`).join('\n')}\n`
    const criteria = files.map((file, index) => ({ id: `copy-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: file.target, sha256: hash(file.content) } }))
    criteria.push({ id: 'index', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: indexPath, sha256: hash(indexText) } })
    const steps = files.flatMap((file, index) => [
      { id: `read-${index}`, capabilityId: 'tool.filesystem_read_file', input: { path: file.source }, dependsOn: index ? [`write-${index - 1}`] : [], acceptanceCriterionIds: [] },
      { id: `write-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path: file.target, content: '@observed' }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'], select: { field: 'type', equals: 'text', valueField: 'text' } }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`copy-${index}`] },
    ])
    steps.push({ id: 'index', capabilityId: 'tool.filesystem_write_file', input: { path: indexPath, content: indexText }, dependsOn: ['write-9'], acceptanceCriterionIds: ['index'] })
    const proposal = { goal, criteria, steps }
    const request = `请只用 life_execute_work_plan 执行这份明确授权的二十一步文件分类任务。依赖读取结果写入对应的新文件，原文件必须保留。不拆成零散工具、不缩短计划、不更改目标名称、路径、内容或验收条件。参数：${JSON.stringify(proposal)}`
    const experience = { round, goal, files, indexPath, indexText, steps: steps.length, completed: false, modelRequestUsed: true, requestSha256: hash(request), requestChars: request.length }
    report.longWorkExperiences.push(experience)
    await fs.writeFile(path.join(directory, 'declared-proposal.json'), JSON.stringify(proposal, null, 2), { flag: 'wx' })
    const before = await sampleLive2D(stage)
    await sendExecutionRequest(chat, request)
    const targets = files.flatMap(file => [{ path: file.source, operation: '读取文件或资料' }, { path: file.target, operation: '创建一个文件', marker: file.content }])
    targets.push({ path: indexPath, operation: '创建一个文件', marker: indexText })
    const deadline = Date.now() + 120000
    let actualIndex
    while (Date.now() < deadline) {
      await approveSyntheticOperation([chat, settings], targets)
      actualIndex = await fs.readFile(indexPath, 'utf8').catch(() => null)
      if (actualIndex === indexText)
        break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    check('The actual configured model completes a declared twenty-one-step task without shortening its plan', actualIndex === indexText, { round, goal, expectedIndexHash: hash(indexText), actualIndexHash: actualIndex == null ? null : hash(actualIndex) })
    for (const file of files) {
      assert.equal(await fs.readFile(file.source, 'utf8'), file.content)
      assert.equal((await fs.stat(file.source)).mtimeMs, file.sourceMtimeMs)
      assert.equal(await fs.readFile(file.target, 'utf8'), file.content)
    }
    check('All ten copied artifacts match their observed sources and preserve original source bytes and timestamps', true, { round })
    await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
    const item = settings.locator('article[data-work-plan-id]').filter({ hasText: goal })
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
    experience.planId = await item.getAttribute('data-work-plan-id')
    experience.obligationId = await item.getAttribute('data-work-obligation-id')
    await item.locator('summary').click()
    check('The actual product displays every one of the twenty-one steps and independently verified root completion', await item.locator('ol > li').count() === 21, { round, planId: experience.planId })
    await capture(settings, `long-work-${round}-verified`)
    const after = await sampleLive2D(stage)
    check('Live2D keeps drawing throughout the actual multi-window work', after.models.length === 1 && after.models[0].drawFrame?.frame > (before.models[0]?.drawFrame?.frame ?? 0), { round })
    await settings.reload()
    await item.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 30000 })
    experience.completed = true
    experience.indexSha256 = hash(actualIndex)
    check('Reload retains the same long-task identity and independently verified completion', await item.getAttribute('data-work-obligation-id') === experience.obligationId, { round })
  }
}
