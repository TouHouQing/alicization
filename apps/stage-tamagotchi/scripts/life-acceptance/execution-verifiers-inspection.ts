import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { executionVerificationRegistryKey } from '../../src/main/services/alicization/execution/verification-recipes'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.verifierExperiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const registry = JSON.parse((await database.getMetaValue(executionVerificationRegistryKey))!)
  assert.deepEqual(registry, { version: 1, quality: [], external: [], reconciliation: [] })
  // Other completed workflows can push these audits beyond the recent view.
  const audits = []
  let afterId: string | undefined
  do {
    const page = await database.readLifeIngressPage({ source: 'execution-verifier-configuration', afterId, limit: 4 })
    assert.equal(page.cardId, 'default')
    audits.push(...page.entries)
    assert.ok(audits.length <= 6, 'Only this fixture configuration may be present')
    afterId = page.next ?? undefined
  } while (afterId)
  assert.equal(audits.length, 6)
  for (const experience of report.verifierExperiences) {
    const matching = audits.filter(item => (item.payload.items as Array<{ id: string }>).some(entry => entry.id === experience.id))
    assert.equal(matching.length, 1)
    assert.equal(matching[0].status, 'settled')
  }
  await writeFile(join(root, 'execution-verifiers-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'three-ui-import-apply-reload-revoke-workflows', audits: audits.length }, null, 2))
}
finally { await database.close() }
