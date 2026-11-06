import assert from 'node:assert/strict'
import process from 'node:process'

import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import sqlite3 from 'sqlite3'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { readPersonaDevelopment } from '../../src/main/services/alicization/persona-development/schema'

const root = resolve(process.argv[2] ?? '')
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
const profile = await realpath(report.profile)
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0 && report.credentialsRemoved)
const db = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
const connection = await new Promise<sqlite3.Database>((resolve, reject) => {
  const value = new sqlite3.Database(join(profile, 'alicizations/cards/default/alicization.db'), sqlite3.OPEN_READONLY, error => error ? reject(error) : resolve(value))
})
try {
  const view = await db.readLifeState()
  const state = readPersonaDevelopment(view.values)
  const facet = state.facets.find(item => item.id === 'qa-persona-work-restraint')
  assert.equal(facet?.status, 'withdrawn')
  assert.equal(facet.version, 2)
  assert.equal(facet.label, '')
  assert.equal(facet.sources.length, 0)
  const trials = await new Promise<Array<{ turn_id: string, request_hash: string, facet_version: number, status: string }>>((resolve, reject) => connection.all('SELECT turn_id,request_hash,facet_version,status FROM life_persona_trials WHERE card_id=? AND facet_id=?', ['default', facet.id], (error, rows) => error ? reject(error) : resolve(rows as Array<{ turn_id: string, request_hash: string, facet_version: number, status: string }>)))
  assert.ok(trials.length >= 1)
  assert.ok(trials.every(item => item.facet_version === 1 && /^[a-f\d]{64}$/u.test(item.request_hash)))
  for (const trial of trials) assert.ok(await db.hasPublishedLifeTurn('default', trial.turn_id))
  const result = { passed: true, readOnly: true, trialCount: trials.length, exactRequestHashes: trials.map(item => item.request_hash), withdrawnVersion: facet.version, body: 'real Live2D final-draw frames in product report', scope: 'actual provider turn consumed a trial; explicit UI correction and withdrawal persisted; historical support was synthetic, not actual elapsed days' }
  await writeFile(join(root, 'persona-growth-after-shutdown.json'), JSON.stringify(result, null, 2))
}
finally {
  await new Promise<void>((resolve, reject) => connection.close(error => error ? reject(error) : resolve()))
  await db.close()
}
