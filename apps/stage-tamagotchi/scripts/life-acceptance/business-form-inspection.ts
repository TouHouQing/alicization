import type { Buffer } from 'node:buffer'

import assert from 'node:assert/strict'
import process from 'node:process'

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

interface Experience {
  round: number
  goal: string
  planId: string
  obligationId: string
  completed: boolean
  marker: string
  receiptId: string
  receiptPath: string
  attachmentPath: string
  attachmentName: string
  attachmentBytes: number
  attachmentSha256: string
  attachmentMtimeMs: number
  exportPath: string
  exportBytes: number
  exportSha256: string
  cliInput: Record<string, unknown>
  foreignText: string
}
const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(resolve('output') + sep))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
const experiences = report.businessFormExperiences as Experience[]
assert.equal(experiences.length, 3)
assert.equal(new Set(experiences.map(item => item.planId)).size, 3)
assert.equal(report.businessBrowserProfileCopied, false)
const db = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
try {
  const deliveries = []
  for (const experience of experiences) {
    assert.equal(experience.completed, true)
    for (const file of [experience.receiptPath, experience.attachmentPath, experience.exportPath]) {
      const child = relative(await realpath(root), await realpath(file))
      assert.ok(!isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`))
    }
    const view = await db.readLifeState({ executionPlanId: experience.planId })
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(goal && plan)
    assert.equal(goal.summary, experience.goal)
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.verification?.independent, true)
    assert.equal(goal.verification.verdict, 'satisfied')
    assert.equal(plan.steps.length, 11)
    assert.equal(plan.revision, 1)
    assert.equal(plan.browserBinding?.kind, 'authorized-page')
    assert.ok(plan.steps.every(step => step.capabilityId.startsWith('tool.browser_') || step.capabilityId === 'coding_agent.cli'))
    const results = view.execution!.results.filter(item => item.planId === plan.id && item.planRevision === plan.revision)
    assert.equal(results.length, 11)
    assert.ok(results.every(result => result.state === 'verified' && result.effectId))
    assert.equal(new Set(results.map(result => result.effectId)).size, 11)
    for (const step of plan.steps) {
      const result = results.find(item => item.stepId === step.id && item.inputHash === step.inputHash)
      assert.ok(result)
      const effect = await db.getLifeEffect(result.effectId!)
      assert.ok(effect?.status === 'settled' && effect.receipt?.outcome === 'success')
      const output = effect.receipt.output as Record<string, unknown>
      assert.ok(!JSON.stringify(output).includes(experience.foreignText))
      if (step.capabilityId.startsWith('tool.browser_'))
        assert.equal(output.browser, 'authorized-page')
      if (['fill-note', 'select-category', 'submit'].includes(step.id))
        assert.equal(output.inputMode, 'trusted-cdp')
      if (step.id === 'select-attachment') {
        assert.equal(output.serverReceiptVerified, false)
        assert.deepEqual(output.files, [{ name: experience.attachmentName, bytes: experience.attachmentBytes, sha256: experience.attachmentSha256 }])
      }
      if (step.id === 'read-result')
        assert.ok(String(output.text).includes('业务已接收，回执已保存'))
      if (step.id === 'download-export')
        assert.deepEqual(step.input, experience.cliInput)
    }
    const receipt = JSON.parse(await readFile(experience.receiptPath, 'utf8'))
    assert.deepEqual(receipt, { receiptId: experience.receiptId, round: experience.round, note: experience.marker, category: 'illustration', attachmentName: experience.attachmentName, attachmentBytes: experience.attachmentBytes, attachmentSha256: experience.attachmentSha256, exportSha256: experience.exportSha256 })
    const attachment = await readFile(experience.attachmentPath)
    assert.equal(attachment.length, experience.attachmentBytes)
    assert.equal(hash(attachment), experience.attachmentSha256)
    assert.equal((await stat(experience.attachmentPath)).mtimeMs, experience.attachmentMtimeMs)
    const exported = await readFile(experience.exportPath)
    assert.equal(exported.length, experience.exportBytes)
    assert.equal(hash(exported), experience.exportSha256)
    const service = report.businessFormService.cases.find((item: { round: number }) => item.round === experience.round)
    assert.equal(service.submissions, 1)
    assert.equal(service.exports, 1)
    assert.equal(service.rejected, 0)
    const downloads = report.businessFormService.requests.filter((item: { path: string, status: number }) => item.path === `/export/${experience.round}` && item.status === 200)
    assert.equal(downloads.length, 1)
    assert.equal(downloads[0].credentialPresent, false)
    deliveries.push({ planId: plan.id, goalId: goal.id, verifiedSteps: results.length, selectedBrowser: true, fileSelectionDistinguishedFromServiceReceipt: true, originalSourceUnchanged: true, authenticatedSubmissions: 1, publicTokenExports: 1, copiedBrowserCredentials: false })
  }
  await writeFile(join(root, 'business-form-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'Three actual model/UI authenticated forms with iframe/select/file selection, independent service receipts and governed public-token HTTP export through an explicitly approved CLI program. This does not certify automatic external-browser download interception or popup transfer ownership.', deliveries }, null, 2), { flag: 'wx' })
}
finally { await db.close() }
