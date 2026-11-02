/* eslint-disable unicorn/prefer-dom-node-text-content -- Inspect actual rendered controls. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

exports.runDownloadRecoveryProductChecks = async function ({ settings, root, report, check, capture }) {
  const fixture = JSON.parse(await fs.readFile(path.join(root, 'download-recovery-fixture.json'), 'utf8'))
  assert.equal(fixture.writerClosed, true)
  assert.equal(fixture.nativeExecutionClaimed, false)
  await settings.goto(`${settings.url().split('#')[0]}#/settings/life`)
  const region = settings.getByRole('region', { name: '需要核对的下载占用', exact: true })
  await region.waitFor({ timeout: 15000 })
  report.downloadRecoveryExperiences = []
  for (let round = 0; round < fixture.artifacts.length; round++) {
    const before = fixture.artifacts.length - round
    assert.equal(await region.locator('article').count(), before)
    const item = region.locator('article').first()
    const effectId = await item.getAttribute('data-recovery-effect-id')
    const artifact = fixture.artifacts.find(item => item.effectId === effectId)
    assert.ok(artifact)
    await item.getByRole('button', { name: '重新核对', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '暂时无法独立核对' }).waitFor({ timeout: 10000 })
    check('Partial download bytes never become an independent success through recheck', await region.locator('article').count() === before)
    await item.getByRole('button', { name: '由我接管', exact: true }).click()
    const button = item.getByRole('button', { name: '确认接管并结束任务', exact: true })
    await button.waitFor({ timeout: 10000 })
    check('Native download takeover waits for explicit stopped-writer acknowledgment', await button.isDisabled())
    check('Native takeover previews the exact reserved directory', (await item.locator('p.break-all').innerText()).trim() === artifact.directory)
    await item.getByRole('switch', { name: '我已停止相关程序，并会自行处理已有结果', exact: true }).check()
    await button.click()
    await region.getByRole('status').filter({ hasText: '已记录你的接管决定并结束相关任务' }).waitFor({ timeout: 10000 })
    await region.locator(`article[data-recovery-effect-id="${effectId}"]`).waitFor({ state: 'detached', timeout: 10000 })
    check('Native takeover releases only its own unknown resource', await region.locator('article').count() === before - 1)
    check('Native takeover preserves the original partial file bytes', await fs.readFile(artifact.path, 'utf8') === artifact.content)
    report.downloadRecoveryExperiences.push({ effectId, target: artifact.directory, source: 'synthetic-restart-journal-and-real-product-controls', independentSuccessClaimed: false })
    await capture(settings, `native-download-takeover-${round + 1}`)
  }
  await settings.reload()
  await settings.getByRole('button', { name: '刷新', exact: true }).waitFor({ timeout: 10000 })
  await settings.getByRole('button', { name: '刷新', exact: true }).click()
  await settings.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === '刷新' && !button.disabled))
  check('Reload does not revive taken-over native download ownership', await settings.getByRole('region', { name: '需要核对的下载占用', exact: true }).count() === 0)
}
