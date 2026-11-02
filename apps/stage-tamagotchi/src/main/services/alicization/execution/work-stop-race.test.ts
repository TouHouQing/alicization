import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { commitWorkStop } from './work-stop-control'

it('records the same host cancellation despite concurrent life commits without changing the accepted plan', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-stop-race-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_read_file': vi.fn(async () => ({ ok: true })) }, onError: vi.fn() })
  try {
    await db.upsertTaskThread({ id: 'cancel-owned', kind: 'mixed', status: 'planned', goal: 'Read an owned file' })
    const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'cancel-owned', capabilityId: 'tool.filesystem_read_file', parameters: { path: join(root, 'source.txt') } })
    const commit = db.commitLifeState
    let competing = 0
    vi.spyOn(db, 'commitLifeState').mockImplementation(async (input) => {
      if (input.operationKey.startsWith('work-stop:')) {
        competing++
        await commit({ cardId: 'alice', operationKey: `other-life-event:${competing}`, changes: [{ owner: 'emotion', key: 'qa:concurrent-life', value: JSON.stringify({ revision: competing }) }] })
      }
      return commit(input)
    })
    const fence = vi.fn()
    const input = { cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'same-host-stop', action: 'cancel' as const }
    await commitWorkStop(db, input, fence)
    const view = await db.readLifeState({ executionPlanId: plan.id })
    expect(competing).toBeGreaterThan(0)
    expect(fence).toHaveBeenCalled()
    expect(view.obligations.find(goal => goal.id === plan.rootObligationId)?.status).toBe('cancelled')
    expect(view.execution?.plans.find(item => item.id === plan.id)).toEqual(plan)
    expect(await db.getLifeIngress('work-stop:same-host-stop')).toMatchObject({ status: 'settled', payload: { action: 'cancel', planId: plan.id, rootObligationId: plan.rootObligationId } })
  }
  finally {
    vi.restoreAllMocks()
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})
