const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { sendExecutionRequest } = require('./execution-work-product-checks.cjs')

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

// Only the fresh child owned by this experience is populated. The model receives
// its root and a content marker; it never receives the matching file name.
async function runLocalSearchProductChecks({ app, chat, root, report, capture, check }) {
  const documents = await app.evaluate(({ app }) => app.getPath('documents'))
  const workspace = path.join(documents, 'Alicization_Workspace')
  await fs.mkdir(workspace, { recursive: true })
  const canonicalWorkspace = await fs.realpath(workspace)
  const nonce = randomUUID()
  const directory = path.join(canonicalWorkspace, `life-owned-content-search-${nonce}`)
  await fs.mkdir(directory)
  assert.equal(await fs.realpath(directory), directory)
  const needle = `LOCAL_SEARCH_${randomUUID().replaceAll('-', '')}`
  const files = []
  const fixture = report.localSearchFixture = { format: 'owned-native-content-search-v1', nonce, directory, canonicalWorkspace, createdAt: Date.now(), needle, files, completed: false }
  const save = () => fs.writeFile(path.join(root, 'local-search-fixture.json'), JSON.stringify(fixture, null, 2))
  await fs.writeFile(path.join(directory, 'owner.json'), JSON.stringify({ format: fixture.format, nonce }), { flag: 'wx' })
  for (let index = 0; index < 24; index++) {
    const name = `${randomUUID()}.txt`
    const text = index === 17
      ? `  开头的空格应当保留。\r\n${needle}\r\n命中行之外的正文：她记得今天画稿完成了。\r\n结尾校验：${randomUUID()}  \r\n`
      : `这是一份无关资料，序号 ${index}，${randomUUID()}。\r\n`
    const bytes = Buffer.from(text)
    const file = path.join(directory, name)
    await fs.writeFile(file, bytes, { flag: 'wx' })
    const stat = await fs.stat(file)
    files.push({ name, sha256: digest(bytes), bytes: bytes.length, device: String(stat.dev), inode: String(stat.ino), match: index === 17 })
  }
  await save()
  const prompt = `请在这个本地目录中用内容搜索查找包含“${needle}”的文本文件，然后完整读取命中的文件，告诉我命中行以外的正文和结尾校验。文件名未知，请根据搜索结果再读文件，不要猜文件名。只读这个目录，不修改或创建任何文件。目录：${directory}`
  fixture.promptSha256 = digest(Buffer.from(prompt))
  fixture.reply = await sendExecutionRequest(chat, prompt)
  fixture.completed = true
  await save()
  check('Actual chat completes one foreground reply for an unknown-name local content search', fixture.reply && !fixture.reply.interrupted)
  await capture(chat, 'native-local-search-reply')
}

// Node's read-only SQLite connection avoids changing the Electron native ABI.
// This runs only after normal native shutdown. Prose is never execution proof.
async function inspectLocalSearchAfterShutdown({ report, profile, root, check }) {
  const fixture = report.localSearchFixture
  if (!fixture)
    return
  assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
  const { DatabaseSync } = require('node:sqlite')
  const database = new DatabaseSync(path.join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  try {
    const rows = database.prepare('SELECT effect_id, turn_id, status, intent_hash, payload_ref_json, receipt_ref_json, created_at FROM life_effect_intents WHERE kind = ? AND created_at >= ? ORDER BY created_at,effect_id LIMIT 101').all('execute', fixture.createdAt)
    assert.ok(rows.length > 0 && rows.length <= 100, 'Actual experience needs bounded persisted execution effects')
    const effects = rows.map((row) => {
      assert.equal(digest(Buffer.from(row.payload_ref_json)), row.intent_hash)
      return { ...row, payload: JSON.parse(row.payload_ref_json), receipt: JSON.parse(row.receipt_ref_json || 'null') }
    })
    const search = effects.find(effect => effect.payload.capabilityId === 'tool.filesystem_search_files' && effect.payload.parameters.path === fixture.directory && effect.payload.parameters.query === fixture.needle)
    assert.ok(search, 'The real provider must invoke content search on the undisclosed file name')
    assert.equal(search.status, 'settled')
    assert.equal(search.receipt?.outcome, 'success')
    const output = search.receipt.output
    assert.equal(output.operation, 'search_files')
    assert.equal(output.status, 'completed')
    assert.equal(output.truncated, false)
    const expected = fixture.files.find(file => file.match)
    const target = path.join(fixture.directory, expected.name)
    assert.ok(output.matches.some(match => path.resolve(fixture.directory, match.path) === target))
    const native = JSON.parse(output.output)
    assert.equal(native.executionStopped, true)
    assert.match(native.nativeProcessBindingHash, /^[a-f0-9]{64}$/u)
    const read = effects.find(effect => effect.turn_id === search.turn_id && effect.payload.capabilityId === 'tool.filesystem_read_file' && path.resolve(effect.payload.parameters.path) === target && effect.created_at >= search.created_at)
    assert.ok(read, 'A matching-line preview must be followed by an actual full file read in the same turn')
    assert.equal(read.status, 'settled')
    assert.equal(read.receipt?.outcome, 'success')
    assert.equal(read.receipt.output.verifiedPath, target)
    assert.equal(read.receipt.output.truncated, false)
    assert.equal(read.receipt.output.byteLength, expected.bytes)
    assert.equal(read.receipt.output.contentHash, expected.sha256)
    assert.equal(digest(Buffer.from(read.receipt.output.content)), expected.sha256)
    assert.ok(effects.every(effect => effect.payload.effectContract?.sideEffect === 'read'), 'This read-only request must not produce writes')
    fixture.evidence = { searchEffectId: search.effect_id, readEffectId: read.effect_id, turnId: search.turn_id, nativeProcessBindingHash: native.nativeProcessBindingHash, fullReadSha256: expected.sha256, fullReadBytes: expected.bytes, readOnly: true }
    check('Persisted actual search and complete read bind one turn to native stopped-tree evidence and exact bytes', true, fixture.evidence)
  }
  finally { database.close() }
  // Exact directory identity, nonce, file inventory and hashes are checked before
  // cleanup. An altered/foreign file preserves the whole fixture for inspection.
  assert.equal(await fs.realpath(fixture.directory), fixture.directory)
  assert.equal(path.dirname(fixture.directory), fixture.canonicalWorkspace)
  assert.equal(path.basename(fixture.directory), `life-owned-content-search-${fixture.nonce}`)
  const owner = JSON.parse(await fs.readFile(path.join(fixture.directory, 'owner.json'), 'utf8'))
  assert.deepEqual(owner, { format: fixture.format, nonce: fixture.nonce })
  const names = await fs.readdir(fixture.directory)
  assert.deepEqual(names.sort(), ['owner.json', ...fixture.files.map(file => file.name)].sort())
  for (const file of fixture.files) {
    const target = path.join(fixture.directory, file.name)
    const stat = await fs.lstat(target)
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1)
    assert.equal(String(stat.dev), file.device)
    assert.equal(String(stat.ino), file.inode)
    assert.equal(digest(await fs.readFile(target)), file.sha256)
  }
  fixture.filesUnchanged = true
  await fs.writeFile(path.join(root, 'local-search-after-shutdown.json'), JSON.stringify({ passed: true, evidence: fixture.evidence, filesUnchanged: true, nativeSignatureReverifiedAfterExit: false }, null, 2), { flag: 'wx' })
  await fs.rm(fixture.directory, { recursive: true })
  fixture.cleanedAfterNormalShutdown = true
}

exports.runLocalSearchProductChecks = runLocalSearchProductChecks
exports.inspectLocalSearchAfterShutdown = inspectLocalSearchAfterShutdown
