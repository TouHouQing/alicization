import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createExecutionResourceBroker } from './resource-broker'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'life-work-admission-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ resourceBroker: broker, read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  const registry = createCanonicalToolRegistry()
  const signal = new AbortController().signal
  await life.admit({ cardId: 'alice', turnId: 'current-request', conversationId: 'primary', messages: [{ role: 'user', content: '接下当前的有界工作；实际执行仍需正常权限及独立验收。' }] }, signal)
  const before = (capabilityId: string, actionId: string, parameters: unknown, turnId = 'current-request') => life.beforeAction({ cardId: 'alice', turnId, actionId, capabilityId, parameters, effectContract: registry.resolveActive(capabilityId)?.effects }, signal)
  return { root, database, broker, life, before, close: async () => { await database.close(); await rm(root, { recursive: true, force: true }) } }
}

it.each(['tool.life_execute_work_plan', 'tool.life_use_learned_procedure'])('admits %s while an unrelated execution owner finishes, retaining exact dispatch and source ownership', async (capabilityId) => {
  const f = await fixture()
  const active = f.broker.acquire({ owner: 'background-window-finishing', resources: ['host:execution'], coordinationOnly: true })
  try {
    const parameters = { goal: 'a newly requested bounded plan', version: 'a'.repeat(64) }
    const action = await f.before(capabilityId, 'new-plan', parameters)
    await action.authorizeDispatch(parameters)
    await expect(action.assertDispatchCurrent()).resolves.toMatchObject({ effectId: action.id })
    await expect(action.authorizeDispatch({ ...parameters, goal: 'borrowed changed goal' })).rejects.toThrow()
    const effect = await f.database.getLifeEffect(action.id)
    expect(effect?.payload.parameters).toEqual(parameters)
    expect(effect?.status).toBe('dispatched')
    expect((await f.database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
    await f.life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: { status: 'accepted' }, interrupted: false })
    expect(f.broker.snapshot()).toHaveLength(1)
  }
  finally { f.broker.settle(active, { stopped: true, uncertain: false }); await f.close() }
})

it('accepts only plan metadata beside an unknown executor, while actual filesystem dispatch remains fenced and no output appears', async () => {
  const f = await fixture()
  try {
    f.broker.restoreQuarantine({ cardId: 'other-card', effectId: 'unknown-native-writer', resources: ['host:execution'] })
    const parameters = { goal: 'accepted but not physically executed' }
    const action = await f.before('tool.life_execute_work_plan', 'admit', parameters)
    await action.authorizeDispatch(parameters)
    await f.life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: { status: 'accepted' }, interrupted: false })
    const path = join(f.root, 'must-not-exist.txt')
    const blocked = f.before('tool.filesystem_write_file', 'actual-write', { path, content: 'must not run' })
    await expect(blocked).rejects.toThrow('reconciliation')
    await expect(blocked).rejects.toMatchObject({ code: 'EXECUTION_RESOURCE_BUSY', resourceConflict: { effectId: 'unknown-native-writer', uncertain: true, resourceKinds: ['host'] } })
    await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(f.broker.snapshot()).toMatchObject([{ effectId: 'unknown-native-writer', uncertain: true }])
    expect((await f.database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
  }
  finally { await f.close() }
})

it('keeps unknown lookalike operations and mixed execution scopes behind the host fence', async () => {
  const f = await fixture()
  const active = f.broker.acquire({ owner: 'actual-executor', resources: ['host:execution'] })
  try {
    await expect(f.before('tool.life_execute_work_plan_unregistered', 'lookalike', {})).rejects.toThrow('another executor')
    expect(() => f.broker.acquire({ owner: 'mixed-role', resources: ['life-work-admission:alice', 'physical-input:desktop'] })).toThrow('another executor')
    expect(f.broker.snapshot()).toHaveLength(1)
  }
  finally { f.broker.settle(active, { stopped: true, uncertain: false }); await f.close() }
})

it('serializes the same card admission and retains uncertain admission without promoting it to execution or completion', async () => {
  const f = await fixture()
  try {
    const input = { goal: 'same card admission' }
    const action = await f.before('tool.life_use_learned_procedure', 'first', input)
    await action.authorizeDispatch(input)
    await f.life.admit({ cardId: 'alice', turnId: 'next-request', conversationId: 'primary', messages: [{ role: 'user', content: '当前的另一个工作请求。' }] }, new AbortController().signal)
    await expect(f.before('tool.life_execute_work_plan', 'second', { goal: 'other plan' }, 'next-request')).rejects.toThrow('another executor')
    await f.life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { effectMayHaveOccurred: true }, interrupted: true })
    expect((await f.database.getLifeEffect(action.id))?.status).toBe('uncertain')
    await expect(f.before('tool.life_execute_work_plan', 'third', { goal: 'retry without reconciliation' }, 'next-request')).rejects.toThrow('uncertain result')
    expect((await f.database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
  }
  finally { await f.close() }
})
