import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { actionDidNotStart, inheritActionNotStarted, withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkPlanToolSpec } from './work-plan-tool'

it.each(['schema', 'input', 'cycle', 'persistence'] as const)('settles only a genuinely unstarted plan admission: %s', async (fault) => {
  const root = await mkdtemp(join(tmpdir(), 'life-plan-refusal-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const read = vi.fn(async () => ({ ok: true }))
  const work = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: (error) => { throw error }, tools: { 'tool.filesystem_read_file': read } })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const signal = new AbortController().signal
  try {
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'main', messages: [{ role: 'user', content: 'Read the owned note' }] }, signal)
    const spec = createWorkPlanToolSpec(input => work.propose({ ...input, cardId: 'alice', turnId: 'request' }))
    const parameters = spec.parameters.parse({ goal: 'Read this note', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Is it useful?', artifactIds: [] } }], steps: [{ id: 'read', capabilityId: 'tool.filesystem_read_file', input: fault === 'input' ? {} : { path: join(root, 'note.txt') }, dependsOn: fault === 'cycle' ? ['read'] : [], acceptanceCriterionIds: [] }] })
    if (fault === 'persistence') {
      const commit = db.commitLifeState
      vi.spyOn(db, 'commitLifeState').mockImplementation(input => input.operationKey.startsWith('work-plan-save:proposal:') ? Promise.reject(new Error('Owned persistence failure after task creation')) : commit(input))
    }
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'admit', capabilityId: 'tool.life_execute_work_plan', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.life_execute_work_plan')!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const failure = await withActionDispatch(action.assertDispatchCurrent, () => spec.execute(fault === 'schema' ? { ...parameters, goal: '' } : parameters)).then(() => { throw new Error('Expected rejection') }, error => error)
    const output = inheritActionNotStarted(failure, { ok: false, status: 'failed', errorCode: 'TOOL_EXECUTION_FAILED', effectMayHaveOccurred: true })
    expect(actionDidNotStart(output, 'alice', action.id)).toBe(fault !== 'persistence')
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output, interrupted: false })
    const state = await db.readLifeState()
    expect((await db.getLifeEffect(action.id))?.status).toBe(fault === 'persistence' ? 'uncertain' : 'settled')
    expect(state.execution?.plans ?? []).toHaveLength(0)
    expect(read).not.toHaveBeenCalled()
  }
  finally { await work.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
