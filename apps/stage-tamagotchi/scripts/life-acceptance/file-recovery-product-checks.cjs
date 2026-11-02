/* eslint-disable unicorn/prefer-dom-node-text-content -- Assert the actually rendered recovery target. */
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

exports.runFileRecoveryProductChecks = async function ({ stage, settings, root, report, check, capture }) {
  const expected = JSON.parse(await fs.readFile(path.join(root, 'expected.json'), 'utf8'))
  assert.equal(expected.records.length, 3)
  const target = path.join(root, 'owned-file.bin')
  assert.equal(digest(await fs.readFile(target)), expected.currentHash)
  const base = settings.url().split('#')[0]
  await settings.goto(`${base}#/settings/life`)
  const region = settings.getByRole('region', { name: '文件版本与恢复', exact: true })
  await region.waitFor({ timeout: 15000 })
  assert.equal(expected.orphanIds.length, 2)
  for (const id of expected.orphanIds) {
    const file = path.join(report.profile, 'alicizations/cards/default/file-recovery', `${id}.blob`)
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        await fs.stat(file)
      }
      catch (error) {
        if (error.code === 'ENOENT')
          break
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 125))
    }
    await assert.rejects(fs.stat(file), { code: 'ENOENT' })
  }
  check('Actual startup maintenance removes only the aged unreferenced ciphertext and zero-length partial file', true)
  report.fileRecoveryExperiences = []
  for (const [index, version] of [...expected.records].reverse().entries()) {
    const item = region.locator(`[data-file-version-id="${version.id}"]`)
    await item.getByRole('button', { name: '查看恢复内容', exact: true }).click()
    const preview = region.locator('[data-file-recovery-preview]')
    await preview.waitFor({ timeout: 10000 })
    check('Recovery preview names only this run\'s actual file', (await preview.locator('p').first().innerText()).trim() === target)
    const confirm = preview.getByRole('button', { name: '确认恢复这个文件', exact: true })
    check('Actual recovery confirmation starts disabled', await confirm.isDisabled())
    await preview.getByRole('switch', { name: '我已核对文件和恢复内容，并同意结束相关任务', exact: true }).check()
    await confirm.click()
    await region.getByRole('status').filter({ hasText: '已完成文件恢复' }).waitFor({ timeout: 20000 })
    check('Actual UI restores the exact encrypted original bytes', digest(await fs.readFile(target)) === version.originalHash)
    const renderer = await stage.evaluate(() => {
      const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')
      return { renderer: store.stageModelRenderer, mounted: document.documentElement.dataset.alicizationStageMounted }
    })
    check('Live2D remains mounted during host recovery', renderer.renderer === 'live2d' && renderer.mounted === 'true')
    report.fileRecoveryExperiences.push({ versionId: version.id, originalHash: version.originalHash, source: 'prior-Electron-actual-dispatched-capture-and-current-renderer-host-confirmation' })
    await capture(settings, `file-recovery-confirmed-${index + 1}`)
  }
  await settings.reload()
  await region.getByRole('button', { name: '刷新文件版本', exact: true }).click()
  for (const version of expected.records)
    await region.locator(`[data-file-version-id="${version.id}"]`).getByText('已完成文件恢复，相关任务结果仍按原记录保留。', { exact: true }).waitFor()
  check('Reload does not replay or revive restored file work', digest(await fs.readFile(target)) === expected.records[0].originalHash)
  const forgotten = expected.records.at(-1)
  await region.locator(`[data-file-version-id="${forgotten.id}"]`).getByRole('button', { name: '清理此恢复版本', exact: true }).click()
  const preview = region.locator('[data-file-recovery-preview]')
  const confirm = preview.getByRole('button', { name: '确认清理恢复版本', exact: true })
  await confirm.waitFor()
  check('Cleanup has its own disabled confirmation and explains earlier backup invalidation', await confirm.isDisabled() && (await preview.innerText()).includes('早于本次清理的整卡备份也将无法还原'))
  await preview.getByRole('switch', { name: '我确认不再需要这个恢复版本，并了解旧整卡备份会失效', exact: true }).check()
  await confirm.click()
  await region.getByRole('status').filter({ hasText: '已清理恢复版本' }).waitFor({ timeout: 15000 })
  check('Actual cleanup preserves the existing business file', digest(await fs.readFile(target)) === expected.records[0].originalHash)
  await assert.rejects(fs.stat(path.join(report.profile, 'alicizations/cards/default/file-recovery', `${forgotten.id}.blob`)), { code: 'ENOENT' })
  check('Actual renderer cleanup removes only the selected ciphertext', true)
  report.fileRecoveryCleanup = { versionId: forgotten.id, scope: 'current-card-original-ciphertext-only-business-file-preserved' }
  await capture(settings, 'file-recovery-cleanup-confirmed')
  await region.screenshot({ path: path.join(root, 'file-recovery-complete-panel.png') })
}

exports.inspectFileRecoveryAfterShutdown = async function ({ profile, root, report, check }) {
  const { DatabaseSync } = require('node:sqlite')
  const expected = JSON.parse(await fs.readFile(path.join(root, 'expected.json'), 'utf8'))
  const db = new DatabaseSync(path.join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  try {
    const rows = db.prepare('SELECT effect_id,status,payload_ref_json,receipt_ref_json FROM life_effect_intents WHERE card_id=\'default\' AND kind=\'execute\' AND json_extract(payload_ref_json,\'$.capabilityId\')=\'host.filesystem_restore_version\'').all()
    assert.equal(rows.length, 3)
    for (const row of rows) {
      const payload = JSON.parse(row.payload_ref_json)
      const receipt = JSON.parse(row.receipt_ref_json)
      assert(expected.records.some(version => version.id === payload.parameters.versionId))
      assert.equal(row.status, 'settled')
      assert.equal(receipt.outcome, 'success')
      assert.equal(receipt.output.proofScope, 'file-version-only-no-original-goal-completion')
      const process = db.prepare('SELECT payload_ref_json FROM life_ingress WHERE ingress_id=?').get(`file-recovery-process:${row.effect_id.slice('file-restore:'.length)}`)
      assert.ok(process)
    }
    const withdrawn = db.prepare('SELECT source_ref_json FROM life_evidence_cleanup_jobs WHERE mode=\'forget\' AND json_extract(source_ref_json,\'$.kind\')=\'file-version\'').all()
    assert.equal(withdrawn.length, 1)
    assert.equal(JSON.parse(withdrawn[0].source_ref_json).id, report.fileRecoveryCleanup.versionId)
    check('Read-only reopen preserves the exact cleanup withdrawal without rewriting any native restore receipt', true)
    const orphanAudits = db.prepare('SELECT status,payload_ref_json FROM life_ingress WHERE source=\'file-version-orphan-cleanup\'').all()
    assert.equal(orphanAudits.length, 4)
    assert(orphanAudits.every(row => row.status === 'settled' && expected.orphanIds.includes(JSON.parse(row.payload_ref_json).snapshot.id)))
    check('Read-only reopen preserves prepared and observed cleanup receipts for exactly the two actual orphan files', true)
    check('Read-only reopen binds all three UI recoveries to durable native file receipts', true)
    report.fileRecoveryInspection = { passed: true, count: rows.length, scope: 'three-file-version-recoveries-only-no-original-goal-or-body-performance-qualification' }
  }
  finally { db.close() }
}
