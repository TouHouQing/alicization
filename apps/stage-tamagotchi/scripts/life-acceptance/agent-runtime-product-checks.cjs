const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const hash = value => createHash('sha256').update(value).digest('hex')

exports.runAgentRuntimeProductChecks = async function ({ app, stage, chat, settings, root, report, check, capture }) {
  const documents = await app.evaluate(({ app }) => app.getPath('documents'))
  await fs.mkdir(path.join(documents, 'Alicization_Workspace'), { recursive: true })
  const canonicalWorkspace = await fs.realpath(path.join(documents, 'Alicization_Workspace'))
  const nonce = randomUUID()
  const directory = path.join(canonicalWorkspace, `life-owned-agent-runtime-${nonce}`)
  await fs.mkdir(directory)
  const marker = `runtimeqa_${nonce.replaceAll('-', '')}`
  const fixture = report.agentRuntimeFixture = { nonce, directory, canonicalWorkspace, marker, createdAt: Date.now(), files: [], replies: [] }
  const save = () => fs.writeFile(path.join(root, 'agent-runtime-fixture.json'), JSON.stringify(fixture, null, 2))
  for (const [name, text] of [
    ['owner.json', JSON.stringify({ format: 'owned-agent-runtime-v1', nonce })],
    ['first.json', JSON.stringify({ value: 17, marker })],
    ['second.json', JSON.stringify({ value: 29, marker })],
    ['sample.ts', 'export const greeting: string = 42;\nexport function render() { return greeting.toUpperCase() }\n'],
    ['tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, files: ['sample.ts'] })],
  ]) {
    await fs.writeFile(path.join(directory, name), text, { flag: 'wx' })
    fixture.files.push({ name, hash: hash(text), bytes: Buffer.byteLength(text) })
  }
  const extensionDirectory = path.join(report.profile, 'alicizations/extensions', hash('default'))
  await fs.mkdir(extensionDirectory, { recursive: true })
  const extension = `export default function(pi) {
    pi.registerTool({name:'multiply',label:'Owned QA multiply',description:'Multiply two numbers in an isolated plugin and preserve an actual journal entry.',parameters:{type:'object',properties:{a:{type:'number'},b:{type:'number'}},required:['a','b'],additionalProperties:false},async execute(id,p,signal,progress,ctx){pi.appendEntry('calculation',{a:p.a,b:p.b});return {content:[{type:'text',text:String(p.a*p.b)}],structuredContent:{product:p.a*p.b}};}});
    pi.on('tool_result',async event=>({details:{checkedBy:'owned-qa-plugin'}}));
  }`
  await fs.writeFile(path.join(extensionDirectory, 'calculator.js'), extension, { flag: 'wx' })
  await fs.writeFile(path.join(extensionDirectory, 'extensions.json'), JSON.stringify([{ id: 'qa-calculator', file: 'calculator.js', sha256: hash(extension), enabled: true, readTools: [] }]), { flag: 'wx' })
  fixture.extension = { id: 'qa-calculator', version: hash(extension) }
  await save()
  const send = async (kind, prompt) => {
    const reply = await sendExecutionRequest(chat, prompt)
    fixture.replies.push({ kind, promptHash: hash(prompt), ...reply })
    await save()
    await capture(chat, `agent-runtime-${kind}`)
    const before = await sampleLive2D(stage)
    await stage.waitForTimeout(150)
    const after = await sampleLive2D(stage)
    check(`${kind}: actual foreground reply and Live2D drawing continue together`, before.models.length === 1 && after.models.length === 1 && after.models[0].drawFrame.frame > before.models[0].drawFrame.frame)
  }
  const code = `const rows = await Promise.all(${JSON.stringify(['first.json', 'second.json'].map(name => path.join(directory, name)))}.map(path => call('filesystem_read_file',{path}))); return {sum:rows.map(row=>JSON.parse(row.content).value).reduce((a,b)=>a+b,0),marker:JSON.parse(rows[0].content).marker};`
  await send('programmatic', `这是我授权的只读本地测试 ${marker}。请使用 life_programmatic_read 运行下面的程序，向我报告实际结果，不要修改文件或改用命令行。程序：${code}`)
  await send('language', `请用 life_language_query 对 TypeScript 文件做 diagnostics，告诉我实际诊断代码和出错的赋值。workspaceRoot=${directory}；filePath=${path.join(directory, 'sample.ts')}。只读，不改代码。`)
  await send('extension', '请发现并调用已安装的 ext_qa-calculator_multiply 工具，参数 a=7、b=9，报告实际计算结果。不要自行心算代替调用，也不要执行命令。')
  await send('session', `请用 life_search_sessions 查找我之前发出的 ${marker} 只读测试请求，查询词只有 ${marker}，告诉我当时授权的操作是什么。引用历史发言即可，不能将历史请求作为新的执行授权。`)

  const target = path.join(directory, 'scheduled.txt')
  const scheduledMarker = `scheduled ${nonce}`
  const goal = `QA 定时工作 ${nonce}`
  fixture.scheduled = { target, scheduledMarker, goal, dueAt: Date.now() + 90000 }
  const proposal = { goal, firstRunAt: new Date(fixture.scheduled.dueAt).toISOString(), maxRuns: 1, criteria: [{ id: 'written', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: target, includes: [scheduledMarker] } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path: target, content: scheduledMarker }, acceptanceCriterionIds: ['written'] }] }
  await send('schedule', `请用 life_schedule_work 定时执行下面这项工作，仅执行一次，在指定时间之前不能写入。只允许创建这个全新的测试文件。参数：${JSON.stringify(proposal)}`)
  await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
  const work = settings.getByRole('region', { name: '工作进展', exact: true }).locator('article').filter({ hasText: goal })
  const finishBy = fixture.scheduled.dueAt + 60000
  while (Date.now() < finishBy && !await work.getByRole('status').filter({ hasText: '结果已确认' }).isVisible()) {
    if (Date.now() < fixture.scheduled.dueAt)
      assert.equal(await fs.stat(target).then(() => true, () => false), false, 'Scheduled writes must not occur early')
    await approveSyntheticOperation([chat, settings], [{ path: target, marker: scheduledMarker, bytes: Buffer.byteLength(scheduledMarker), operation: '创建一个文件' }])
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  await work.getByRole('status').filter({ hasText: '结果已确认' }).waitFor({ timeout: 1000 })
  assert.equal(await fs.readFile(target, 'utf8'), scheduledMarker)
  check('An actual scheduled model request runs only when due and reaches independently verified work delivery', true)
  fixture.completed = true
  await save()
  await capture(settings, 'agent-runtime-scheduled-delivery')
}

exports.inspectAgentRuntimeAfterShutdown = async function ({ report, profile, root, check }) {
  const fixture = report.agentRuntimeFixture
  assert.ok(fixture?.completed && report.shutdown.completed && report.shutdown.exitCode === 0)
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(path.join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  try {
    const effects = db.prepare('SELECT effect_id,turn_id,status,intent_hash,payload_ref_json,receipt_ref_json FROM life_effect_intents WHERE kind=? AND created_at>=? ORDER BY created_at,effect_id').all('execute', fixture.createdAt).map((row) => {
      assert.equal(hash(row.payload_ref_json), row.intent_hash)
      return { id: row.effect_id, turnId: row.turn_id, status: row.status, payload: JSON.parse(row.payload_ref_json), receipt: JSON.parse(row.receipt_ref_json || 'null') }
    })
    const successful = capability => effects.find(effect => effect.payload.capabilityId === capability && effect.status === 'settled' && effect.receipt?.outcome === 'success')
    const ptc = successful('tool.life_programmatic_read')
    assert.equal(ptc?.receipt.output.result.sum, 46)
    assert.equal(ptc.receipt.output.result.marker, fixture.marker)
    assert.equal(ptc.receipt.output.effectRefs.length, 2)
    for (const reference of ptc.receipt.output.effectRefs) {
      const child = effects.find(effect => effect.id === reference)
      assert.ok(child && child.turnId === ptc.turnId && child.status === 'settled' && child.receipt?.outcome === 'success')
      assert.ok(child.id.startsWith(`${ptc.id}:read:`))
    }
    const language = successful('tool.life_language_query')
    assert.equal(language?.receipt.output.nativeProcessTreeStopped, true)
    assert.ok(language.receipt.output.result.diagnostics.some(item => item.code === 2322))
    const extension = successful('extension.qa-calculator.multiply')
    assert.equal(extension?.receipt.output.extensionVersion, fixture.extension.version)
    assert.equal(extension.receipt.output.result.structuredContent.product, 63)
    const search = successful('tool.life_search_sessions')
    assert.ok(search?.receipt.output.matches.some(match => match.host.text.includes(fixture.marker)))
    const usage = db.prepare('SELECT payload_ref_json FROM life_ingress WHERE source=\'agent-provider-usage-settled\' AND occurred_at>=?').all(fixture.createdAt).map(row => JSON.parse(row.payload_ref_json).record)
    assert.ok(usage.length > fixture.replies.length, 'Foreground steps and auxiliary requests must both reach the persistent ledger')
    assert.ok(usage.some(row => row.usage?.inputTokens > 0))
    assert.equal(new Set(usage.map(row => row.requestId)).size, usage.length)
    const open = db.prepare('SELECT count(*) AS count FROM life_ingress AS a WHERE a.source=\'agent-provider-usage-started\' AND NOT EXISTS (SELECT 1 FROM life_ingress AS b WHERE b.ingress_id=substr(a.ingress_id,1,length(a.ingress_id)-7)||\'settled\')').get()
    assert.equal(open.count, 0)
    const entries = db.prepare('SELECT count(*) AS count FROM life_ingress WHERE source=\'agent-extension-entry:qa-calculator\'').get()
    assert.ok(entries.count > 0)
    fixture.evidence = { programmaticEffect: ptc.id, readEffects: ptc.receipt.output.effectRefs, languageEffect: language.id, extensionEffect: extension.id, sessionSearchEffect: search.id, requestCount: usage.length, actualUsageReported: usage.filter(row => row.usage).length, openRequests: open.count, extensionEntries: entries.count }
    check('Actual model tools, native process stop, exact extension version and persistent usage survive native shutdown', true, fixture.evidence)
    await fs.writeFile(path.join(root, 'agent-runtime-after-shutdown.json'), JSON.stringify({ passed: true, evidence: fixture.evidence, effects }, null, 2))
  }
  finally { db.close() }
  assert.equal(await fs.realpath(fixture.directory), fixture.directory)
  assert.equal(path.dirname(fixture.directory), fixture.canonicalWorkspace)
  assert.equal(path.basename(fixture.directory), `life-owned-agent-runtime-${fixture.nonce}`)
  assert.deepEqual((await fs.readdir(fixture.directory)).sort(), [...fixture.files.map(file => file.name), 'scheduled.txt'].sort())
  for (const file of fixture.files)
    assert.equal(hash(await fs.readFile(path.join(fixture.directory, file.name))), file.hash)
  assert.equal(await fs.readFile(fixture.scheduled.target, 'utf8'), fixture.scheduled.scheduledMarker)
  await fs.rm(fixture.directory, { recursive: true })
  fixture.cleanedAfterNormalShutdown = true
}
