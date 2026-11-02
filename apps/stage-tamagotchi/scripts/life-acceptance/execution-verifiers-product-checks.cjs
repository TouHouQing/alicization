/* eslint-disable unicorn/prefer-dom-node-text-content -- Verify the rendered configuration labels. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { randomUUID } = require('node:crypto')
const process = require('node:process')

const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

exports.runExecutionVerifiersProductChecks = async function ({ settings, stage, report, capture, check, click }) {
  assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP || isOwnedHostViewport(report))
  const base = settings.url().split('#')[0]
  await settings.goto(`${base}#/settings/life`)
  const section = settings.locator('[data-execution-verifiers]')
  await section.getByRole('heading', { name: '结果验收规则', exact: true }).waitFor({ timeout: 30000 })
  const upload = async raw => section.locator('[data-verifier-import]').setInputFiles({ name: 'owned-verification-rules.json', mimeType: 'application/json', buffer: Buffer.from(raw) })
  report.verifierExperiences = []
  for (let repetition = 0; repetition < 3; repetition++) {
    const id = `owned-report-${randomUUID()}`
    const configuration = JSON.stringify({ version: 1, quality: [{ id, version: '1', checks: [{ kind: 'includes', values: ['Conclusion'] }] }], external: [], reconciliation: [] })
    await upload(configuration)
    await section.locator('[data-verifier-preview]').getByText(id, { exact: true }).waitFor({ timeout: 10000 })
    check(`Verifier rules ${repetition}: importing only previews a replacement`, await section.locator('[data-verifier-active]').count() === 0)
    await click(section.locator('[data-verifier-confirm]'))
    await section.getByRole('status').filter({ hasText: '验收规则已保存。' }).waitFor({ timeout: 10000 })
    await section.locator('[data-verifier-active]').getByText(`${id} · 质量检查`, { exact: true }).waitFor({ timeout: 10000 })
    await settings.reload()
    await section.locator('[data-verifier-active]').getByText(`${id} · 质量检查`, { exact: true }).waitFor({ timeout: 15000 })
    check(`Verifier rules ${repetition}: application survives an actual renderer reload`, await section.locator('[data-verifier-preview]').count() === 0)
    await upload(configuration)
    await section.locator('[data-verifier-preview]').waitFor({ timeout: 10000 })
    await upload('{"version":1,"quality":[{"id":"unsafe","version":"1","checks":[{"kind":"shell","command":"unused"}]}],"external":[]}')
    await section.getByRole('alert').waitFor({ timeout: 10000 })
    check(`Verifier rules ${repetition}: invalid import removes old confirmation and preserves active configuration`, await section.locator('[data-verifier-preview]').count() === 0 && await section.locator('[data-verifier-active]').innerText() === `${id} · 质量检查`)
    await capture(settings, `execution-verifier-invalid-import-${repetition}`)
    await upload(JSON.stringify({ version: 1, quality: [], external: [], reconciliation: [] }))
    await section.locator('[data-verifier-preview]').getByText('此配置会撤销所有已注册规则；未取得证明的任务会继续等待核验。', { exact: true }).waitFor({ timeout: 10000 })
    await click(section.locator('[data-verifier-confirm]'))
    await section.getByText('尚未添加规则。普通文件验收和人工确认仍可使用。', { exact: true }).waitFor({ timeout: 10000 })
    await settings.reload()
    await section.getByText('尚未添加规则。普通文件验收和人工确认仍可使用。', { exact: true }).waitFor({ timeout: 15000 })
    check(`Verifier rules ${repetition}: explicit revocation survives reload`, await section.locator('[data-verifier-active]').count() === 0)
    const body = await sampleLive2D(stage)
    check(`Verifier rules ${repetition}: actual Live2D remains mounted during governance`, body.models.length > 0)
    check(`Verifier rules ${repetition}: settings remain inside the viewport`, await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    report.verifierExperiences.push({ id, imported: true, applied: true, invalidRejected: true, revoked: true, reloads: 2, live2dModels: body.models.length })
  }
}
