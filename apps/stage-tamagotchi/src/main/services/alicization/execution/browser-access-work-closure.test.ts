import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('pauses browser work on access revocation while preserving an unrelated accepted file delivery', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-browser-access-work-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors: unknown[] = []
  let reading = false
  let browserCalls = 0
  const runtime = createWorkPlanExecutionRuntime({ captureBrowserBinding: () => ({ kind: 'managed', id: 'unit-browser' }), isBrowserBindingCurrent: binding => binding?.kind === 'managed' && binding.id === 'unit-browser', getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: {
    'tool.browser_read_page': async (_input, signal) => {
      signal.throwIfAborted()
      reading = true
      browserCalls++
      await new Promise<never>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    },
    'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }),
  } })
  try {
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    await life.admit({ cardId: 'alice', turnId: 'browser-request', conversationId: 'primary', messages: [{ role: 'user', content: '读取已授权页面并生成结果。' }] }, signal)
    const forbidden = join(root, 'must-not-run.txt')
    const first = await runtime.propose({ cardId: 'alice', turnId: 'browser-request', goal: 'Read authorized browser before producing a result', criteria: [{ id: 'result', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: forbidden, includes: ['must never be written'] } }], steps: [
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text' }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path: forbidden, content: 'must never be written' }, dependsOn: ['read'], acceptanceCriterionIds: ['result'] },
    ] })
    await vi.waitFor(() => expect(reading).toBe(true))
    await life.admit({ cardId: 'alice', turnId: 'file-request', conversationId: 'primary', messages: [{ role: 'user', content: '另存一份独立的本地结果。' }] }, signal)
    const path = join(root, 'independent.txt')
    const second = await runtime.propose({ cardId: 'alice', turnId: 'file-request', goal: 'Deliver an independent file', criteria: [{ id: 'result', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['independent result'] } }], steps: [
      { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'independent result' }, dependsOn: [], acceptanceCriterionIds: ['result'] },
    ] })
    await runtime.suspendBrowser('alice')
    await vi.waitFor(async () => {
      const view = await db.readLifeState()
      expect(view.obligations.find(goal => goal.threadId === first.rootThreadId)?.status).toBe('blocked')
      expect(view.obligations.find(goal => goal.threadId === second.rootThreadId)?.status).toBe('fulfilled')
    }, { timeout: 10000 })
    expect(await readFile(path, 'utf8')).toBe('independent result')
    await expect(readFile(forbidden)).rejects.toMatchObject({ code: 'ENOENT' })
    await runtime.wakeReady()
    expect(browserCalls).toBe(1)
    expect(errors.every(error => error instanceof Error && error.name === 'AbortError')).toBe(true)
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
}, 30000)

it('releases the executor before slow delivery and rechecks revised criteria without repeating browser input or file writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-browser-delivery-release-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const pendingDelivery = Promise.withResolvers<void>()
  const deliveryStarted = Promise.withResolvers<void>()
  const errors: unknown[] = []
  let notified = false
  let browserCalls = 0
  let writeCalls = 0
  const runtime = createWorkPlanExecutionRuntime({ captureBrowserBinding: () => ({ kind: 'managed', id: 'unit-browser' }), isBrowserBindingCurrent: binding => binding?.kind === 'managed' && binding.id === 'unit-browser', getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), onSettled: async () => {
    expect(broker.snapshot()).toHaveLength(0)
    deliveryStarted.resolve()
    await pendingDelivery.promise
    notified = true
  }, tools: {
    // Chromium input is covered by the actual browser tests; this counterpart
    // makes the post-execution notification indefinitely slow on purpose.
    'tool.browser_read_page': async () => { browserCalls++; return { ok: true, status: 'completed', elements: [] } },
    'tool.filesystem_write_file': (input, signal) => { writeCalls++; return callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }) },
  } })
  try {
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '观察已授权页面并保存报告。' }] }, new AbortController().signal)
    const path = join(root, 'result.txt')
    const criteria = [{ id: 'result', required: true, proofScope: 'structure' as const, predicate: { kind: 'text-content' as const, path, includes: ['observed result'] } }]
    const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Read the page and preserve its delivered report', criteria: [...criteria, { id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '保留人工审核吗？', artifactIds: ['result'] } }], steps: [
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text' }, dependsOn: [], acceptanceCriterionIds: [] },
      { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'observed result' }, dependsOn: ['read'], acceptanceCriterionIds: ['result'] },
    ] })
    await deliveryStarted.promise
    let stopped = false
    const takeover = runtime.suspendBrowser('alice').then(() => { stopped = true })
    await vi.waitFor(() => expect(stopped).toBe(true), { timeout: 1000 })
    await takeover
    expect(notified).toBe(false)
    expect(runtime.isActive()).toBe(false)
    expect(runtime.isWriting()).toBe(false)
    expect(broker.snapshot()).toEqual([])
    expect(await readFile(path, 'utf8')).toBe('observed result')
    const goal = (await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)
    expect(goal).toMatchObject({ status: 'blocked', verification: { verdict: 'unknown' } })
    await runtime.changeCriteria({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, expectedGeneration: goal!.generation, contractHash: goal!.proof.acceptance!.contractHash, criteria, requestId: 'remove-host-review' })
    await runtime.run({ cardId: 'alice', planId: accepted.planId, expectedRevision: 2, requestId: 'recheck-revised-delivery' })
    const revised = (await db.readLifeState()).obligations.find(item => item.id === goal!.id)
    expect(revised).toMatchObject({ generation: 2, status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
    expect(notified).toBe(false)
    expect(browserCalls).toBe(1)
    expect(writeCalls).toBe(1)
    pendingDelivery.resolve()
    await vi.waitFor(() => expect(notified).toBe(true))
    expect(errors).toEqual([])
  }
  finally { pendingDelivery.resolve(); await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
}, 30000)
