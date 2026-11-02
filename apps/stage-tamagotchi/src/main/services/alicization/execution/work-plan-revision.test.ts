import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createExecutionResourceBroker } from './resource-broker'
import { workInputHash } from './work-input-bindings'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('revision of unfinished accepted work', () => {
  it('repairs a later blocked step without repeating the already observed write', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-revision-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const write = vi.fn(async (input: Record<string, unknown>) => { await writeFile(String(input.path), String(input.content)); return { ok: true } })
    const read = vi.fn(async (input: Record<string, unknown>) => {
      if (input.path === 'unavailable')
        throw new Error('source unavailable'); return { ok: true }
    })
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.filesystem_write_file': write, 'tool.filesystem_read_file': read } })
    try {
      const path = join(directory, 'report.txt')
      await db.upsertTaskThread({ id: 'report', status: 'planned', goal: 'Save the report and inspect source', kind: 'mixed', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update('accepted content').digest('hex') } } })
      const initial = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'report', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'accepted content' } })
      const input = { path: 'unavailable' }
      const plan = { ...initial, revision: 2, steps: [...initial.steps, { ...initial.steps[0], id: 'read-source', dependsOn: ['perform'], capabilityId: 'tool.filesystem_read_file', input, inputHash: workInputHash({ input }), retryMode: 'read-only' as const }] }
      await runtime.save({ cardId: 'alice', plan, expectedRevision: 1, requestId: 'add-inspection' })
      await expect(runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'run' })).rejects.toThrow('source unavailable')
      const changed = { ...plan, revision: 3, steps: plan.steps.map(step => step.id === 'perform' ? { ...step, input: { path, content: 'changed' }, inputHash: workInputHash({ input: { path, content: 'changed' } }) } : step) }
      await expect(runtime.save({ cardId: 'alice', plan: changed, expectedRevision: 2, requestId: 'change-old-write' })).rejects.toThrow('already observed steps')
      expect((await db.readLifeState()).execution?.plans[0].revision).toBe(2)
      const repaired = { ...plan, revision: 3, steps: plan.steps.map(step => step.id === 'read-source' ? { ...step, input: { path }, inputHash: workInputHash({ input: { path } }) } : step) }
      await expect(runtime.revise({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'change-observed', stepId: 'perform', changes: { content: 'changed' } })).rejects.toThrow('already ran')
      await expect(runtime.revise({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'change-operation', stepId: 'read-source', changes: { capabilityId: 'tool.filesystem_write_file' } })).rejects.toThrow('existing unbound text')
      await runtime.revise({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'repair-source', stepId: 'read-source', changes: { path } })
      expect((await db.readLifeState()).execution?.plans[0]).toEqual(repaired)
      expect((await db.readLifeState()).execution?.results.filter(item => item.state === 'verified')).toHaveLength(1)
      await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 3, requestId: 'resume' })
      expect(write).toHaveBeenCalledTimes(1)
      expect(read).toHaveBeenCalledTimes(2)
      expect(await readFile(path, 'utf8')).toBe('accepted content')
      expect((await db.readLifeState()).obligations[0]).toMatchObject({ status: 'fulfilled', verification: { independent: true } })
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})
