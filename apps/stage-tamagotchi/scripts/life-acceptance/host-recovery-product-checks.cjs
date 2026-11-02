/* eslint-disable unicorn/prefer-dom-node-text-content -- Check visible product text, including its actual target preview. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

exports.runHostRecoveryProductChecks = async function ({ settings, root, report, capture, check }) {
  const fixture = JSON.parse(await fs.readFile(path.join(root, 'host-recovery-fixture.json'), 'utf8'))
  assert.equal(fixture.writerClosed, true)
  const base = settings.url().split('#')[0]
  await settings.goto(`${base}#/settings/life`)
  const region = settings.getByRole('region', { name: '尚未确定的操作', exact: true })
  await region.waitFor({ timeout: 15000 })
  report.hostRecoveryExperiences = []
  for (let round = 0; round < fixture.artifacts.length; round++) {
    const before = await region.locator('article').count()
    assert.equal(before, fixture.artifacts.length - round)
    const item = region.locator('article').first()
    const effectId = await item.getAttribute('data-recovery-effect-id')
    assert.ok(fixture.artifacts.some(artifact => artifact.effectId === effectId))
    await item.getByRole('button', { name: '重新核对', exact: true }).click()
    await region.getByRole('status').filter({ hasText: '暂时无法独立核对' }).waitFor({ timeout: 10000 })
    check('Legacy bytes alone do not become an independent success', await region.locator('article').count() === before)
    await item.getByRole('button', { name: '由我接管', exact: true }).click()
    const button = item.getByRole('button', { name: '确认接管并结束任务', exact: true })
    await button.waitFor({ timeout: 10000 })
    check('Takeover remains disabled until its actual stop acknowledgement', await button.isDisabled())
    const shownPath = (await item.locator('p.break-all').innerText()).trim()
    const owned = fixture.artifacts.find(artifact => artifact.path === shownPath)
    assert.ok(owned, 'Only this run\'s exact synthetic legacy target can be acknowledged')
    assert.ok((await item.innerText()).includes(owned.goal))
    const token = await button.getAttribute('data-recovery-token')
    assert.match(token, /^[a-f\d-]{36}$/)
    await item.getByRole('switch', { name: '我已停止相关程序，并会自行处理已有结果', exact: true }).check()
    await button.click()
    await region.getByRole('status').filter({ hasText: '已记录你的接管决定并结束相关任务' }).waitFor({ timeout: 10000 })
    await region.locator(`article[data-recovery-effect-id="${effectId}"]`).waitFor({ state: 'detached', timeout: 10000 })
    check('Host takeover removes only its own uncertain operation', await region.locator('article').count() === before - 1)
    check('Host takeover preserves the existing artifact bytes', await fs.readFile(owned.path, 'utf8') === owned.content)
    report.hostRecoveryExperiences.push({ effectId: owned.effectId, target: owned.path, source: 'synthetic-restart-history-and-real-product-controls', originalResult: 'unknown', goal: 'cancelled' })
    await capture(settings, `host-recovery-takeover-${round + 1}`)
  }
  await settings.reload()
  await settings.getByRole('button', { name: '刷新', exact: true }).waitFor({ timeout: 10000 })
  await settings.getByRole('button', { name: '刷新', exact: true }).click()
  await settings.getByRole('button', { name: '刷新', exact: true }).waitFor({ state: 'visible' })
  await settings.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.some(button => button.textContent.trim() === '刷新' && !button.disabled)
  })
  check('Reload does not revive any taken-over operation', await settings.getByRole('region', { name: '尚未确定的操作', exact: true }).count() === 0)
  for (const artifact of fixture.artifacts) {
    const goal = settings.locator('article').filter({ hasText: artifact.goal })
    check('Taken-over responsibility is never displayed as fulfilled', !(await goal.allTextContents()).join('').includes('结果已确认'))
  }
}
