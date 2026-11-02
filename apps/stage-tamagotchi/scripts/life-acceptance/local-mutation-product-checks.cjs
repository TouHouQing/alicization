const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { approveSyntheticOperation, sendExecutionRequest } = require('./execution-work-product-checks.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

const digest = value => createHash('sha256').update(value).digest('hex')

exports.runLocalMutationProductChecks = async function ({ app, chat, settings, stage, root, report, capture, check }) {
  const workspace = path.join(await app.evaluate(({ app }) => app.getPath('documents')), 'Alicization_Workspace')
  await fs.mkdir(workspace, { recursive: true })
  const canonicalWorkspace = await fs.realpath(workspace)
  const nonce = randomUUID()
  const directory = path.join(canonicalWorkspace, `life-owned-mutation-${nonce}`)
  await fs.mkdir(directory)
  assert.equal(await fs.realpath(directory), directory)
  const fixture = report.localMutationFixture = { format: 'owned-native-mutation-v1', nonce, directory, canonicalWorkspace, createdAt: Date.now(), files: [], approvals: [], completed: false }
  const save = () => fs.writeFile(path.join(root, 'local-mutation-fixture.json'), JSON.stringify(fixture, null, 2))
  await fs.writeFile(path.join(directory, 'owner.json'), JSON.stringify({ format: fixture.format, nonce }), { flag: 'wx' })
  for (const operation of ['write_file', 'edit_file', 'patch_file']) {
    const name = `${operation}.txt`
    const target = path.join(directory, name)
    const oldText = `ONLY_${randomUUID()}`
    const newText = '已修改 中文🙂 $&'
    const original = `保留开头\r\n${oldText}\r\n保留结尾\r\n`
    const expected = `保留开头\r\n${newText}\r\n保留结尾\r\n`
    await fs.writeFile(target, original, { flag: 'wx' })
    const stat = await fs.lstat(target)
    const file = { name, target, operation, originalSha256: digest(original), expectedSha256: digest(expected), expectedBytes: Buffer.byteLength(expected), device: String(stat.dev), inode: String(stat.ino), completed: false }
    fixture.files.push(file)
    await save()
    const instructions = operation === 'write_file' ? `content=${JSON.stringify(expected)}` : operation === 'edit_file' ? `oldText=${JSON.stringify(oldText)}, newText=${JSON.stringify(newText)}, replaceAll=false` : `changes=${JSON.stringify([{ oldText, newText, replaceAll: false }])}, dryRun=false`
    const prompt = `这是本次已授权的独立测试文件。先用 filesystem_read_file 完整读取 ${target}，然后只调用一次 filesystem_${operation} 修改同一个文件；参数 ${instructions}，expectedHash 必须取刚才真实读取的 contentHash。保留所有 CRLF 换行。直接在这轮使用这些文件工具，不创建工作计划，不调用 CLI 或其他执行渠道，不改其他文件。遇到确认框请等待我确认，执行完后报告结果。`
    file.promptSha256 = digest(prompt)
    let watching = true
    const pending = sendExecutionRequest(chat, prompt).finally(() => {
      watching = false
    })
    const observer = (async () => {
      const deadline = Date.now() + 170000
      while (Date.now() < deadline) {
        if (!watching)
          return
        if (await approveSyntheticOperation([chat, settings], [{ path: target, operation: '替换现有文件的内容', changeOperation: 'replace', marker: expected, expectedHash: file.originalSha256 }])) {
          fixture.approvals.push({ target, originalSha256: file.originalSha256, expectedSha256: file.expectedSha256, at: Date.now() })
          await save()
        }
        await new Promise(resolve => setTimeout(resolve, 125))
      }
      throw new Error('Owned mutation permission observation exceeded its time budget')
    })()
    try {
      [file.reply] = await Promise.all([pending, observer])
    }
    finally { watching = false }
    assert.equal(digest(await fs.readFile(target)), file.expectedSha256)
    assert.equal(fixture.approvals.filter(item => item.target === target).length, 1, 'One exact replacement needs one actual reviewed permission')
    const body = await sampleLive2D(stage)
    check(`Actual ${operation} completes exact bytes after its actual replacement permission with Live2D drawing`, body.models.length === 1 && body.models[0].drawFrame?.frame > 0)
    file.completed = true
    await save()
    await capture(chat, `native-${operation}-reply`)
  }
  fixture.completed = true
  await save()
}

exports.inspectLocalMutationAfterShutdown = async function ({ report, profile, root, check }) {
  const fixture = report.localMutationFixture
  if (!fixture)
    return
  assert.ok(fixture.completed && fixture.files.length === 3 && report.shutdown.completed && report.shutdown.exitCode === 0)
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(path.join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  fixture.evidence = []
  try {
    const effects = db.prepare('SELECT effect_id,turn_id,status,intent_hash,payload_ref_json,receipt_ref_json FROM life_effect_intents WHERE kind=? AND created_at>=? ORDER BY created_at,effect_id LIMIT 101').all('execute', fixture.createdAt).map((row) => {
      assert.equal(digest(row.payload_ref_json), row.intent_hash)
      return { ...row, payload: JSON.parse(row.payload_ref_json), receipt: JSON.parse(row.receipt_ref_json || 'null') }
    })
    assert.ok(effects.length > 0 && effects.length <= 100)
    const mutations = effects.filter(effect => effect.payload.effectContract?.sideEffect !== 'read')
    assert.equal(mutations.length, 3)
    for (const file of fixture.files) {
      const effect = mutations.find(effect => effect.payload.capabilityId === `tool.filesystem_${file.operation}` && effect.payload.parameters.path === file.target)
      assert.ok(effect, `The real model must invoke the explicitly selected ${file.operation}`)
      assert.equal(effect.status, 'settled')
      assert.equal(effect.receipt?.outcome, 'success')
      assert.equal(effect.payload.parameters.expectedHash, file.originalSha256)
      assert.equal(effect.receipt.output.contentHash, file.expectedSha256)
      assert.equal(effect.receipt.output.verifiedPath, file.target)
      const read = effects.find(item => item.turn_id === effect.turn_id && item.payload.capabilityId === 'tool.filesystem_read_file' && item.payload.parameters.path === file.target && item.receipt?.output.contentHash === file.originalSha256)
      assert.ok(read, 'Mutation must derive its version from an actual same-turn full read')
      const versionId = digest(JSON.stringify({ cardId: 'default', effectId: effect.effect_id }))
      const versions = ['before', 'after'].map((phase) => {
        const row = db.prepare('SELECT status,payload_ref_json FROM life_ingress WHERE ingress_id=?').get(`file-version-${phase}:${versionId}`)
        assert.equal(row?.status, 'settled')
        return JSON.parse(row.payload_ref_json)
      })
      assert.equal(versions[0].sha256, file.originalSha256)
      assert.equal(versions[1].sha256, file.expectedSha256)
      assert.ok(versions.every(version => version.path === file.target && version.effectId === effect.effect_id))
      fixture.evidence.push({ operation: file.operation, effectId: effect.effect_id, turnId: effect.turn_id, versionId, originalSha256: file.originalSha256, writtenSha256: file.expectedSha256 })
    }
    check('Read-only reopen binds three explicit real model mutations to original instructions, full reads, exact bytes and immutable recovery journals', true, fixture.evidence)
  }
  finally { db.close() }
  assert.equal(await fs.realpath(fixture.directory), fixture.directory)
  assert.equal(path.dirname(fixture.directory), fixture.canonicalWorkspace)
  assert.equal(path.basename(fixture.directory), `life-owned-mutation-${fixture.nonce}`)
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(fixture.directory, 'owner.json'), 'utf8')), { format: fixture.format, nonce: fixture.nonce })
  assert.deepEqual((await fs.readdir(fixture.directory)).sort(), ['owner.json', ...fixture.files.map(file => file.name)].sort())
  for (const file of fixture.files) {
    const stat = await fs.lstat(file.target)
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1)
    assert.equal(String(stat.dev), file.device)
    assert.equal(String(stat.ino), file.inode)
    assert.equal(digest(await fs.readFile(file.target)), file.expectedSha256)
  }
  await fs.writeFile(path.join(root, 'local-mutation-after-shutdown.json'), JSON.stringify({ passed: true, evidence: fixture.evidence, scope: 'explicit-tool-model-ui-three-owned-file-mutations-not-general-autonomy' }, null, 2), { flag: 'wx' })
  await fs.rm(fixture.directory, { recursive: true })
  fixture.cleanedAfterNormalShutdown = true
}
