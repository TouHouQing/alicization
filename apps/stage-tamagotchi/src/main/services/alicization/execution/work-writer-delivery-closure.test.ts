import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('continues independently accepted work while quiet delivery waits, retaining both results across restart without replay', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-work-quiet-delivery-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  let ready = false
  const notification = Promise.withResolvers<void>()
  const deliveries: string[] = []
  const errors: unknown[] = []
  const write = vi.fn((input: Record<string, unknown>, signal: AbortSignal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }))
  const broker = createExecutionResourceBroker()
  let runtime = createWorkPlanExecutionRuntime({
    getDatabase: () => db,
    enabled: () => true,
    canContinue: () => ready,
    broker,
    interrupts: createExecutionInterruptRegistry(broker),
    tools: { 'tool.filesystem_write_file': write },
    onError: error => errors.push(error),
    onSettled: async ({ thread }) => { deliveries.push(thread.id); await notification.promise },
  })
  try {
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    const accepted: Array<{ rootThreadId: string, path: string, content: string }> = []
    for (const number of [1, 2]) {
      const turnId = `request-${number}`
      const path = join(root, `delivery-${number}.txt`)
      const content = `Independent accepted delivery ${number} 中文🙂`
      await life.admit({ cardId: 'alice', turnId, conversationId: 'primary', messages: [{ role: 'user', content: `保存第 ${number} 份交付，忙时稍后告知我。` }] }, signal)
      const result = await runtime.propose({ cardId: 'alice', turnId, goal: `Save delivery ${number}`, criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: [content] } }], steps: [{ id: 'save', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content }, acceptanceCriterionIds: ['file'] }] })
      accepted.push({ rootThreadId: result.rootThreadId, path, content })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    }
    expect(write).not.toHaveBeenCalled()
    ready = true
    await runtime.wakeReady()
    await vi.waitFor(() => expect(deliveries.sort()).toEqual(accepted.map(item => item.rootThreadId).sort()))
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect(runtime.isWriting()).toBe(false)
    expect(broker.snapshot()).toEqual([])
    expect(write).toHaveBeenCalledTimes(2)
    const times: number[] = []
    for (const item of accepted) {
      expect(await readFile(item.path, 'utf8')).toBe(item.content)
      times.push((await stat(item.path)).mtimeMs)
      const goal = (await db.readLifeState()).obligations.find(goal => goal.threadId === item.rootThreadId)
      expect(goal).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
      const events = await db.listExecutionEvents({ threadId: item.rootThreadId })
      expect(events.filter(event => event.kind === 'result' && event.payload?.source === 'committed-work-result')).toHaveLength(1)
    }
    notification.resolve()
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    await runtime.dispose()
    await db.close()
    db = await setupAlicizationDb(root, { cardId: 'alice' })
    const restoredBroker = createExecutionResourceBroker()
    runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker: restoredBroker, interrupts: createExecutionInterruptRegistry(restoredBroker), tools: { 'tool.filesystem_write_file': write }, onError: error => errors.push(error) })
    await runtime.wakeReady()
    expect(write).toHaveBeenCalledTimes(2)
    for (const [index, item] of accepted.entries()) {
      expect((await stat(item.path)).mtimeMs).toBe(times[index])
      const events = await db.listExecutionEvents({ threadId: item.rootThreadId })
      expect(events.filter(event => event.kind === 'result' && event.payload?.source === 'committed-work-result')).toHaveLength(1)
    }
    expect(errors).toEqual([])
  }
  finally {
    notification.resolve()
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
