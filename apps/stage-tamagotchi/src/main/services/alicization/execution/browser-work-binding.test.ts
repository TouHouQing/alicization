import type { BrowserWorkBinding } from '../../../../shared/execution-contracts'

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { reobserveBrowserWork } from './browser-work-binding'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('durable browser environment and explicit work continuation', () => {
  it('blocks an old surface after actual database reopening, refreshes opaque observations and preserves prior file effects', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-browser-work-restart-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    let binding: BrowserWorkBinding = { kind: 'authorized-page', id: 'first-grant' }
    const errors: unknown[] = []
    const prelude = join(root, 'already-delivered.txt')
    const receipt = join(root, 'server-receipt.txt')
    const reads: string[] = []
    const types: string[] = []
    let writes = 0
    const create = () => {
      const broker = createExecutionResourceBroker()
      return createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), captureBrowserBinding: () => binding, isBrowserBindingCurrent: current => current?.id === binding.id && current.kind === binding.kind, tools: {
        // This counterpart injects a definite pre-dispatch failure. The actual
        // browser/CDP implementation is exercised separately against Chromium.
        'tool.browser_read_page': async () => { reads.push(binding.id); return { ok: true, elements: [{ text: 'Chosen field', selector: `element:${binding.id}` }] } },
        'tool.browser_type_text': async (input) => {
          types.push(String(input.selector))
          expect(input.selector).toBe(`element:${binding.id}`)
          if (binding.id === 'first-grant')
            return { ok: false, status: 'failed', effectMayHaveOccurred: false }
          await writeFile(receipt, String(input.text), { flag: 'wx' })
          return { ok: true, status: 'completed' }
        },
        'tool.filesystem_write_file': async (input) => { writes++; await writeFile(String(input.path), String(input.content), { flag: 'wx' }); return { ok: true } },
      } })
    }
    let runtime = create()
    try {
      await createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now }).admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '保存第一份成果，然后在已授权页面填写内容。' }] }, new AbortController().signal)
      const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Keep the original delivery and finish the browser field', criteria: [{ id: 'receipt', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: receipt, includes: ['reconnected content'] } }], steps: [
        { id: 'prelude', capabilityId: 'tool.filesystem_write_file', input: { path: prelude, content: 'preserved original result' }, dependsOn: [], acceptanceCriterionIds: [] },
        { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, dependsOn: ['prelude'], acceptanceCriterionIds: [] },
        { id: 'type', capabilityId: 'tool.browser_type_text', input: { selector: 'from-read', text: 'reconnected content', clearExisting: true }, inputBindings: [{ parameter: 'selector', stepId: 'read', path: ['elements'], select: { field: 'text', equals: 'Chosen field', valueField: 'selector' } }], dependsOn: ['read'], acceptanceCriterionIds: ['receipt'] },
      ] })
      await vi.waitFor(async () => expect((await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('blocked'))
      await runtime.dispose()
      const before = await db.readLifeState({ executionPlanId: accepted.planId })
      const plan = before.execution!.plans[0]
      const goal = before.obligations.find(goal => goal.threadId === accepted.rootThreadId)!
      const firstFile = before.execution!.results.find(result => result.stepId === 'prelude')!
      const original = await stat(prelude)
      expect(plan.browserBinding).toEqual(binding)
      const thread = (await db.getTaskThread(accepted.rootThreadId))!
      // Seed the documented interrupted-startup condition without claiming a
      // real process crash: a nonterminal thread has no surviving executor.
      await db.upsertTaskThread({ ...thread, status: 'running', expectedUpdatedAt: thread.updatedAt })
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      binding = { kind: 'authorized-page', id: 'second-grant' }
      runtime = create()
      await runtime.wakeReady()
      expect(reads).toEqual(['first-grant'])
      expect(types).toEqual(['element:first-grant'])
      expect(await runtime.start({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'ordinary-resume' })).toEqual({ state: 'browser-access-changed' })
      expect((await db.readLifeState()).obligations.find(item => item.id === goal.id)?.status).toBe('blocked')
      const input = { cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'host-reconnect' }
      const first = runtime.reobserve(input)
      expect(runtime.reobserve(input)).toBe(first)
      expect(await first).toEqual({ state: 'browser-rebound' })
      await vi.waitFor(async () => expect((await db.readLifeState()).obligations.find(item => item.id === goal.id)?.status).toBe('fulfilled'), { timeout: 10000 })
      const after = await db.readLifeState({ executionPlanId: plan.id })
      const current = after.execution!.plans[0]
      expect(current.id).toBe(plan.id)
      expect(current.rootObligationId).toBe(goal.id)
      expect(current.acceptanceHash).toBe(plan.acceptanceHash)
      expect(current.obligationGeneration).toBe(plan.obligationGeneration)
      expect(current.revision).toBe(2)
      expect(current.browserBinding).toEqual(binding)
      expect(current.steps.find(step => step.id === 'type')?.inputBindings?.[0].stepId).not.toBe('read')
      expect(after.execution!.results.find(result => result.planRevision === 2 && result.stepId === 'prelude')?.effectId).toBe(firstFile.effectId)
      expect(reads).toEqual(['first-grant', 'second-grant'])
      expect(types).toEqual(['element:first-grant', 'element:second-grant'])
      expect(writes).toBe(1)
      expect((await stat(prelude)).mtimeMs).toBe(original.mtimeMs)
      expect(await readFile(receipt, 'utf8')).toBe('reconnected content')
      const result = after.execution!.results.find(result => result.planRevision === 2 && result.stepId === 'type')!
      expect((await db.getLifeEffect(result.effectId!))?.payload.browserBinding).toEqual(binding)
      expect((await db.getLifeIngress('work-browser-rebind:host-reconnect'))?.payload).toMatchObject({ previousRevision: 1, revision: 2, previousBrowserBinding: { id: 'first-grant' }, browserBinding: binding })
      expect(await runtime.reobserve(input)).toEqual({ state: 'browser-rebound' })
      expect(writes).toBe(1)
      await expect(runtime.reobserve({ ...input, expectedRevision: 2 })).rejects.toThrow('request ID')
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      await expect(runtime.reobserve({ ...input, expectedRevision: 2, requestId: 'after-fulfilled' })).rejects.toThrow('responsibility')
      expect(errors.every(error => String(error).includes('EXECUTION_BROWSER_BINDING_CHANGED'))).toBe(true)
      const unresolved = [{ ...result, planRevision: plan.revision, state: 'awaiting-verification' as const }]
      expect(() => reobserveBrowserWork(plan, unresolved, binding, 'unsafe')).toThrow('Reconcile')
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  }, 30000)
})
