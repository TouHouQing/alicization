import { createHash } from 'node:crypto'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { assertActionDispatchCurrent } from '../execution/action-dispatch-context'
import { createExecutionResourceBroker } from '../execution/resource-broker'
import { acceptedWorkPlanAdmissions } from '../execution/work-plan-admission'
import { createWorkPlanExecutionRuntime } from '../execution/work-plan-execution-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createWorkAutomationRuntime } from './work-automation'

describe('persistent scheduled work through the production executor', () => {
  it('survives restart, executes only the latest missed occurrence, verifies the real file and cancels future work', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'))
    const root = await mkdtemp(join(tmpdir(), 'alicization-work-automation-'))
    let database = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const writes: string[] = []
    const errors: unknown[] = []
    let idle = false
    const createWork = () => createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: cardId => cardId === 'alice', canContinue: () => idle, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: {
      'tool.filesystem_write_file': async (input, signal) => {
        signal.throwIfAborted()
        await assertActionDispatchCurrent(true, { capabilityId: 'tool.filesystem_write_file', parameters: input })
        await writeFile(String(input.path), String(input.content))
        writes.push(String(input.path))
        return { ok: true, finalStatus: 'completed', path: input.path, contentHash: createHash('sha256').update(String(input.content)).digest('hex') }
      },
    } })
    let work = createWork()
    const automations = () => createWorkAutomationRuntime({ database: () => database, work: () => work, enabled: () => true })
    const life = () => createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getEffect: database.getLifeEffect, getIngress: database.getLifeIngress, now: Date.now })
    const proposal = (name: string, count: number) => ({ goal: '按时保存用户指定内容', firstRunAt: new Date(Date.now() + 60000).toISOString(), intervalMinutes: 1, maxRuns: count, criteria: [{ id: 'file', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-content' as const, path: join(root, `${name}-{{run}}.txt`), content: '第 {{run}} 次结果' } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file' as const, input: { path: join(root, `${name}-{{run}}.txt`), content: '第 {{run}} 次结果' }, acceptanceCriterionIds: ['file'] }] })
    try {
      await life().admit({ cardId: 'alice', turnId: 'schedule', conversationId: 'primary', messages: [{ role: 'user', content: '稍后自动每分钟保存一次指定内容，一共三次。' }] }, new AbortController().signal)
      const parameters = proposal('sample', 3)
      const action = await life().beforeAction({ cardId: 'alice', turnId: 'schedule', actionId: 'schedule-tool', capabilityId: 'tool.life_schedule_work', parameters }, new AbortController().signal)
      const scheduled = await automations().schedule(parameters, { cardId: 'alice', turnId: 'schedule' })
      await life().afterAction({ cardId: 'alice', id: action.id, interrupted: false, outcome: 'success', output: scheduled })
      const admitted = acceptedWorkPlanAdmissions(await database.readLifeState(), 'schedule')
      expect(admitted).toHaveLength(1)
      expect(admitted[0]).toMatchObject({ scope: 'accepted-schedule-only-no-step-or-goal-completion', schedule: { groupId: scheduled.groupId, occurrences: scheduled.occurrences.map(({ at, planId }) => ({ at, planId })) } })
      const changed = structuredClone(await database.readLifeState())
      const effect = changed.effects.find(effect => effect.id === action.id)!
      ;(effect.payload.parameters as Record<string, unknown>).firstRunAt = new Date(Date.now() + 120000).toISOString()
      expect(acceptedWorkPlanAdmissions(changed, 'schedule')).toEqual([])
      expect(scheduled.status).toBe('scheduled')
      expect(writes).toEqual([])
      const pending = await automations().list('alice')
      expect(pending.map(plan => plan.status)).toEqual(['waiting', 'waiting', 'waiting'])
      await expect(work.start({ cardId: 'alice', planId: pending[0]!.planId, expectedRevision: 1, requestId: 'premature' })).rejects.toThrow('not due')
      await database.commitLifeState({ cardId: 'alice', operationKey: 'schedule-turn-ended', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:schedule', status: 'settled' }] })
      await work.dispose()
      await database.close()
      database = await setupAlicizationDb(root, { cardId: 'alice' })
      work = createWork()
      idle = true
      vi.setSystemTime(new Date('2026-11-04T10:04:00Z'))
      await work.wakeReady()
      expect(writes).toEqual([join(root, 'sample-3.txt')])
      expect(await readFile(join(root, 'sample-3.txt'), 'utf8')).toBe('第 3 次结果')
      await expect(access(join(root, 'sample-1.txt'))).rejects.toThrow()
      const completed = await automations().list('alice')
      expect(completed.filter(plan => plan.status === 'cancelled')).toHaveLength(2)
      expect(completed.filter(plan => plan.status === 'fulfilled')).toHaveLength(1)
      await work.wakeReady()
      expect(writes).toHaveLength(1)
      idle = false
      await life().admit({ cardId: 'alice', turnId: 'cancel-next', conversationId: 'primary', messages: [{ role: 'user', content: '再定时保存两次。' }] }, new AbortController().signal)
      const next = await automations().schedule(proposal('cancelled', 2), { cardId: 'alice', turnId: 'cancel-next' })
      expect(await automations().cancel(next.groupId, 'alice')).toMatchObject({ status: 'cancelled', stoppedOccurrences: 2 })
      idle = true
      vi.setSystemTime(new Date('2026-11-04T11:00:00Z'))
      await work.wakeReady()
      expect(writes).toHaveLength(1)
      expect(errors).toEqual([])
    }
    finally {
      await work.dispose()
      await database.close()
      await rm(root, { recursive: true, force: true })
      vi.useRealTimers()
    }
  }, 30000)
})
