import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const root = await realpath(resolve(process.argv[2] ?? ''))
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.passed, true)
assert.equal(report.syntheticIdentity, true)
assert.equal(report.shutdown.completed, true)
assert.equal(report.shutdown.exitCode, 0)
const profile = await realpath(report.profile)
assert.equal((await realpath(dirname(profile))).toLowerCase(), (await realpath(tmpdir())).toLowerCase())
assert.match(basename(profile), /^alicization-life-product-regression-/u)

const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const expression = JSON.parse((await database.getMetaValue('life:expression'))!)
  assert.equal(expression.lastAudioReceipt.state, 'audio-ended')
  assert.ok(expression.lastAudioReceipt.playedMs > 0)
  assert.ok(expression.lastAudioReceipt.alignedTextEnd > 0)
  assert.equal(expression.lastAudioReceipt.alignmentSource, 'segment')
  const messages = report.conversationMessages as Array<{ id: string, speechDelivery?: { phase: string, playedMs: number, spokenEnd: number | null, partial: boolean } }>
  assert.ok(messages.some(message => message.speechDelivery?.phase === 'failed' && message.speechDelivery.spokenEnd === null))
  assert.ok(messages.some(message => message.speechDelivery?.phase === 'completed' && message.speechDelivery.partial))
  const reader = new DatabaseSync(join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  let audioReceipts
  try {
    audioReceipts = reader.prepare('SELECT turn_id, state, played_ms, aligned_text_end, alignment_source, error_code FROM life_expression_receipts WHERE state <> \'rendered\' ORDER BY rowid DESC LIMIT 512').all()
  }
  finally { reader.close() }
  assert.ok(audioReceipts.some(receipt => receipt.state === 'audio-ended' && receipt.error_code === null && Number(receipt.aligned_text_end) > 0))
  assert.ok(audioReceipts.some(receipt => receipt.state === 'audio-ended' && receipt.error_code === 'excerpt-only' && Number(receipt.aligned_text_end) > 0))
  assert.ok(audioReceipts.some(receipt => receipt.state === 'audio-interrupted' && Number(receipt.played_ms) > 0))
  assert.ok(audioReceipts.some(receipt => receipt.state === 'audio-failed' && Number(receipt.played_ms) === 0))
  const result = { passed: true, readOnly: true, restartedAfterNormalShutdown: true, lastAudioReceipt: expression.lastAudioReceipt, audioReceipts, cachedMessages: messages.map(message => ({ id: message.id, speechDelivery: message.speechDelivery })) }
  await writeFile(join(root, 'conversation-delivery-after-shutdown.json'), JSON.stringify(result, null, 2))
}
finally { await database.close() }
