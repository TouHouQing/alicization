import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const fixture = JSON.parse(await readFile(join(root, 'life-history-fixture.json'), 'utf8'))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.historyExperiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
try {
  const view = await database.readLifeState()
  for (const id of fixture.ids) {
    const goal = view.obligations.find(goal => goal.id === id)
    assert.ok(goal)
    assert.equal(goal.status, 'cancelled')
    assert.equal(goal.generation, 1)
    assert.ok(goal.summary.startsWith(fixture.prefix))
  }
  const page = await database.readLifeObligationHistory({ cardId: 'default', limit: 20 })
  assert.equal(page.items.length, 20)
  assert.ok(page.nextCursor)
  assert.equal((await database.readLifeState()).revision, view.revision)
  await writeFile(join(root, 'life-history-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, historicalResponsibilitiesPreserved: fixture.ids.length, actualUiRuns: report.historyExperiences.length }, null, 2))
}
finally { await database.close() }
