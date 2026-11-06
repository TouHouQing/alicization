import assert from 'node:assert/strict'
import process from 'node:process'

import { realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { zeroPersonaEffects } from '../../src/main/services/alicization/persona-development/schema'

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.equal(process.env.LIFE_QA_HOST_VIEWPORT, '1')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}${sep}`))
const database = await setupAlicizationDb(profile, { cardId: 'default' })
const facet = { id: 'qa-persona-work-restraint', kind: 'relationship-habit' as const, subject: 'relationship' as const, label: '专注工作时先留出思考空间', context: 'focused-work' as const, exceptions: ['明确邀请聊天时'], effects: { ...zeroPersonaEffects(), initiative: -0.1, expression: -0.1, patience: 0.1 } }
try {
  for (let index = 0; index < 3; index++) {
    const at = Date.now() - (4 - index) * 86_400_000
    const [reflection] = await database.upsertMemoryReflections([{ id: `qa-persona-source-${index}`, cardId: 'default', turnId: `qa-persona-experience-${index}`, sourceKind: 'reply', targetScope: 'relationship', summary: `第${index + 1}次测试经历：专注时留出思考空间。`, lesson: `第${index + 1}次测试经历：用户专注时先留出思考空间，在停顿后自然接话。`, status: 'confirmed', confidence: 0.9, createdAt: at, updatedAt: at }])
    await database.commitLifeState({ cardId: 'default', operationKey: `qa-persona-seed-${index}`, changes: [], mutations: [{ type: 'persona-development', operation: { action: 'observe', observations: [{ facet, source: { cardId: 'default', kind: 'memory_reflections', id: reflection.id, version: String(reflection.updatedAt) }, polarity: 'support' }] } }] })
  }
  await database.commitLifeState({ cardId: 'default', operationKey: 'qa-persona-initially-paused', changes: [], mutations: [{ type: 'persona-development', operation: { action: 'pause' } }] })
}
finally { await database.close() }
await writeFile(join(root, 'persona-growth-fixture.json'), JSON.stringify({ facet, sourceCount: 3, source: 'synthetic historical reviewed experiences for UI and actual-turn consumption; not actual longitudinal use', writerClosedBeforeLaunch: true }, null, 2))
