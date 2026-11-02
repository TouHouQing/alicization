import assert from 'node:assert/strict'
import process from 'node:process'

import { randomUUID } from 'node:crypto'
import { realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP || process.env.LIFE_QA_HOST_VIEWPORT === '1')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const nonce = randomUUID()
const prefix = `QA 历史分页 ${nonce}`
const ids: string[] = []
const database = await setupAlicizationDb(profile, { cardId: 'default' })
try {
  for (let index = 0; index < 65; index++) {
    const id = `qa-history-${nonce}-${index}`
    await database.upsertTaskThread({ id, goal: `${prefix} ${index}`, kind: 'mixed', status: 'cancelled' })
    ids.push(`task:${id}`)
  }
}
finally { await database.close() }
await writeFile(join(root, 'life-history-fixture.json'), JSON.stringify({ prefix, ids, writerClosedBeforeLaunch: true }, null, 2), { flag: 'wx' })
