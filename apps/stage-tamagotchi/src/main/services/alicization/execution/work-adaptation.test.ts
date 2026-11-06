import type { ExecutionWorkProposal } from '../../../../shared/execution-contracts'
import type { WorkAdaptationProvider } from './work-adaptation-runtime'

import process from 'node:process'

import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeExecutionPresenceObserver } from '../life-execution-presence'
import { projectLifeTaskOutcome } from '../life-task-outcome'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { normalizeMcpToolCallResult } from '../main-chat-execution-surface'
import { awaitAlicizationPromiseWithAbort } from '../main-chat-stream-primitives'
import { createAlicizationMainGatewayWorkCoordinator } from '../main-gateway-work-coordinator'
import { configuredLifeGeneration } from '../test-support/configured-life-generation'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { deriveExecutionAttention } from './execution-attention'
import { createExecutionResourceBroker } from './resource-broker'
import { compileWorkAdaptation, readWorkAdaptationContext, workAdaptationPrompt } from './work-adaptation-context'
import { adaptExecutionWork as invokeWorkAdaptation, isRejectedWorkAdaptation } from './work-adaptation-runtime'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse())
    await cleanup()
})

// Ordinary synthetic providers below model an acquired provider lease. Tests
// exercising scheduler deferral call invokeWorkAdaptation without this adapter.
function admittedProvider(generate: WorkAdaptationProvider): WorkAdaptationProvider {
  return async (input) => {
    await input.claimAttempt()
    return generate(input)
  }
}

function adaptExecutionWork(options: Parameters<typeof invokeWorkAdaptation>[0], input: Parameters<typeof invokeWorkAdaptation>[1]) {
  return invokeWorkAdaptation({ ...options, generate: admittedProvider(options.generate) }, input)
}

async function fixture(generate?: WorkAdaptationProvider, fault?: 'host-denied' | 'system-denied' | 'unknown-write' | 'literal' | 'duplicated-read', observe?: Parameters<typeof createWorkPlanExecutionRuntime>[0]['observe']) {
  const root = await mkdtemp(join(tmpdir(), 'alicization-read-repair-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const registry = createCanonicalToolRegistry()
  const broker = createExecutionResourceBroker()
  const errors = vi.fn()
  const writes: string[] = []
  const source = join(root, 'actual-note.txt')
  const preface = join(root, 'preface.txt')
  const destination = join(root, 'result.txt')
  await writeFile(source, 'the actual observed note')
  const tools = Object.fromEntries(['read_file', 'write_file', 'list_directory'].map(toolName => [`tool.filesystem_${toolName}`, async (input: Record<string, unknown>, signal: AbortSignal) => {
    if (toolName === 'write_file')
      writes.push(String(input.path))
    if (toolName === 'read_file' && (fault === 'host-denied' || fault === 'system-denied'))
      return { ok: false, errorCode: fault === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'ALICIZATION_TOOL_DENIED_SYSTEM', sideEffectState: 'none' }
    try {
      const result = await callLocalFilesystem({ toolName, arguments: input, workspace: root, signal })
      if (toolName === 'write_file' && fault === 'unknown-write')
        return { ok: false, effectMayHaveOccurred: true }
      return normalizeMcpToolCallResult(result)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return { ok: false, errorCode: 'ENOENT', sideEffectState: 'none' }
      throw error
    }
  }]))
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), toolRegistry: () => registry, tools, onError: errors, planReadRepair: generate && admittedProvider(generate), observe })
  let closed = false
  async function close() {
    if (closed)
      return
    closed = true
    await runtime.dispose()
    await db.close()
  }
  cleanups.push(async () => {
    await close()
    await rm(root, { recursive: true, force: true })
  })
  const proposal: ExecutionWorkProposal = { goal: 'Find the actual note and save its observed contents', criteria: [{ id: 'contents', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: destination, includes: ['the actual observed note'] } }], steps: [
    { id: 'preface', capabilityId: 'tool.filesystem_write_file', input: { path: preface, content: 'Keep this already completed write' }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'inventory', capabilityId: 'tool.filesystem_list_directory', input: { path: root }, dependsOn: ['preface'], acceptanceCriterionIds: [] },
    { id: 'read-note', capabilityId: 'tool.filesystem_read_file', input: { path: join(root, 'guessed-note.txt') }, dependsOn: ['inventory'], acceptanceCriterionIds: [] },
    { id: 'save-note', capabilityId: 'tool.filesystem_write_file', input: { path: destination, content: '@observed' }, inputBindings: [{ parameter: 'content', stepId: 'read-note', path: ['content', '0', 'text'] }], dependsOn: ['read-note'], acceptanceCriterionIds: ['contents'] },
  ] }
  if (fault === 'duplicated-read') {
    proposal.steps.splice(3, 0, { ...proposal.steps[2], id: 'read-final-note', dependsOn: ['read-note'] })
    proposal.steps[4].dependsOn = ['read-final-note']
    proposal.steps[4].inputBindings![0].stepId = 'read-final-note'
    proposal.criteria.push({ id: 'source-bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-matches-read', path: destination, stepId: 'read-final-note' } })
    proposal.steps[4].acceptanceCriterionIds.push('source-bytes')
  }
  await createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now }).admit({ cardId: 'alice', turnId: 'repair-request', conversationId: 'qa', messages: [{ role: 'user', content: fault === 'literal' ? JSON.stringify(proposal) : `Keep a preface at ${preface}, find the actual note inside ${root}, and save its exact contents at ${destination}.` }] }, new AbortController().signal)
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'repair-request', ...proposal })
  const input = { cardId: 'alice', planId: accepted.planId, signal: new AbortController().signal }
  if (!generate) {
    await vi.waitFor(async () => {
      expect((await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status, errors.mock.calls.map(call => String(call[0])).join('\n')).toBe('blocked')
      expect(runtime.isActive()).toBe(false)
    }, { timeout: 10000 })
  }
  return { root, db, registry, tools, runtime, errors, writes, source, preface, destination, accepted, input, close }
}

function repair(user: string, source: string) {
  const prompt = JSON.parse(user)
  return JSON.stringify({ reason: 'The guessed read did not find a file; read the grounded note path instead.', steps: prompt.steps.map((step: { id: string, input: object }) => step.id === 'read-note' ? { ...step, input: { path: source } } : step) })
}

async function ready(f: Awaited<ReturnType<typeof fixture>>) {
  const context = await readWorkAdaptationContext(f.db, f.input)
  expect(context.state).toBe('ready')
  if (context.state !== 'ready')
    throw new Error(context.reason)
  return context.context
}

describe('grounded future read repair within one responsibility', () => {
  it('rejects a mistyped unobserved repair path before publishing a revision or proposing another read', async () => {
    const f = await fixture()
    const context = await ready(f)
    const before = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
    const unobserved = join(`${f.root}-mistyped`, 'actual-note.txt')
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => repair(user, unobserved))
    await expect(adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).rejects.toThrow('grounded')
    const after = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
    expect(after.execution!.plans[0].revision).toBe(context.plan.revision)
    expect(after.effects.map(effect => effect.id)).toEqual(before.effects.map(effect => effect.id))
    expect(f.writes).toEqual([f.preface])
    expect(await readFile(f.preface, 'utf8')).toBe('Keep this already completed write')
    expect(after.ingress.some(item => item.source === 'work-read-repair-result' && item.payload.reason === 'proposal-rejected' && String(item.payload.errorMessage).includes('grounded'))).toBe(true)
  })

  it('feeds back a mistyped target before dispatch and completes the original byte-copy goal through an observed path binding', async () => {
    let mistyped = ''
    let observedSource = ''
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => {
      const prompt = JSON.parse(user)
      const inventory = prompt.observations.find((item: { stepId: string }) => item.stepId === 'inventory')
      const source = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt').path
      observedSource = source
      if (generate.mock.calls.length === 1) {
        mistyped = join(`${inventory.output.structuredContent.path}-mistyped`, 'actual-note.txt')
        return repair(user, mistyped)
      }
      return JSON.stringify({ reason: 'Use the committed directory entry path without copying its parent spelling.', steps: [{
        id: 'read-final-note',
        capabilityId: 'tool.filesystem_read_file',
        input: {},
        dependsOn: ['inventory'],
        acceptanceCriterionIds: [],
        inputBindings: [{ parameter: 'path', stepId: 'inventory', path: ['structuredContent', 'entries'], select: { field: 'name', equals: 'actual-note.txt', valueField: 'path' } }],
      }] })
    })
    const f = await fixture(generate, 'duplicated-read')
    await vi.waitFor(async () => {
      const view = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
      expect(view.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
      expect(f.runtime.isActive()).toBe(false)
    }, { timeout: 15000 })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(JSON.parse(generate.mock.calls[1][0].user).previousRejections).toEqual([{ attempt: 0, errorMessage: expect.stringContaining('not grounded') }])
    const view = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
    expect(view.execution!.plans[0].revision).toBe(2)
    expect(view.effects.some(effect => (effect.payload.parameters as { path?: string } | undefined)?.path === mistyped)).toBe(false)
    expect(view.effects.filter(effect => effect.payload.capabilityId === 'tool.filesystem_read_file')).toHaveLength(2)
    expect(view.effects.find(effect => effect.actionId === 'read-final-note')?.payload.parameters).toMatchObject({ path: observedSource })
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(await readFile(f.destination, 'utf8')).toBe(await readFile(f.source, 'utf8'))
    expect(view.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.verification).toMatchObject({ independent: true, verdict: 'satisfied' })
    expect(f.errors).toHaveBeenCalledOnce()
    expect(isRejectedWorkAdaptation(f.errors.mock.calls[0][0])).toBe(true)
  }, 20000)

  it('repairs the exact referenced read and removes an obsolete prerequisite without redirecting the write or byte criterion', async () => {
    const f = await fixture(undefined, 'duplicated-read')
    const context = await ready(f)
    const originalSave = context.plan.steps.find(step => step.id === 'save-note')!
    const generate = vi.fn(async ({ user }: { user: string }) => {
      const prompt = JSON.parse(user)
      expect(prompt.retainedStepIds).toEqual(['preface', 'inventory', 'save-note'])
      expect(prompt.requiredReadStepIds).toEqual(['read-final-note'])
      const original = prompt.steps.find((step: { id: string }) => step.id === 'read-final-note')
      return JSON.stringify({ reason: 'Read the observed note under the existing byte-proof source id; remove the obsolete candidate dependency.', steps: [{ ...original, input: { path: f.source }, dependsOn: ['inventory'] }] })
    })
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'revised', revision: 2 })
    const revised = (await f.db.readLifeState({ executionPlanId: f.accepted.planId })).execution!.plans[0]
    expect(revised.steps.some(step => step.id === 'read-note')).toBe(false)
    expect(revised.steps.find(step => step.id === 'save-note')).toEqual(originalSave)
    expect(revised.acceptanceHash).toBe(context.plan.acceptanceHash)
    await f.runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 2, requestId: 'resume-pinned-read-source' })
    await vi.waitFor(async () => expect((await f.db.readLifeState()).obligations.find(goal => goal.id === context.goal.id)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } }), { timeout: 10_000, interval: 25 })
    expect(await readFile(f.destination, 'utf8')).toBe(await readFile(f.source, 'utf8'))
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(generate).toHaveBeenCalledOnce()
    expect(f.errors).not.toHaveBeenCalled()
  })

  it('retains canonical writes and verified observations when the planner returns only future reads', async () => {
    const f = await fixture()
    const before = await stat(f.preface)
    const context = await ready(f)
    const generate = vi.fn(async ({ user }: { user: string }) => {
      const prompt = JSON.parse(user)
      const read = prompt.steps.find((step: { id: string }) => step.id === 'read-note')
      return JSON.stringify({ reason: 'Repair only the failed future read from the observed inventory.', steps: [{ ...read, input: { path: f.source } }] })
    })
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'revised', revision: 2 })
    const revised = (await f.db.readLifeState({ executionPlanId: f.accepted.planId })).execution!.plans[0]
    for (const original of context.plan.steps.filter(step => step.id !== 'read-note'))
      expect(revised.steps.find(step => step.id === original.id)).toEqual(original)
    expect(revised.acceptanceHash).toBe(context.plan.acceptanceHash)
    expect(revised.rootObligationId).toBe(context.plan.rootObligationId)
    await f.runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 2, requestId: 'resume-host-retained-writes' })
    await vi.waitFor(async () => expect((await f.db.readLifeState()).obligations.find(goal => goal.id === context.goal.id)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } }))
    expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
    expect((await stat(f.preface)).mtimeMs).toBe(before.mtimeMs)
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(generate).toHaveBeenCalledOnce()
    expect(f.errors).not.toHaveBeenCalled()
  })

  it.each([false, true])('rejects an unchanged failed read even when unrelated discovery changes=%s', async (extraDiscovery) => {
    const f = await fixture()
    const context = await ready(f)
    const prompt = workAdaptationPrompt(context, f.registry, new Set(Object.keys(f.tools)))
    const proposed = { reason: 'Inspect another path but leave the failed prerequisite unchanged.', steps: JSON.parse(prompt.user).steps }
    if (extraDiscovery)
      proposed.steps.push({ id: 'extra-discovery', capabilityId: 'tool.filesystem_read_file', input: { path: f.source }, dependsOn: ['inventory'], acceptanceCriterionIds: [] })
    expect(() => compileWorkAdaptation(context, JSON.stringify(proposed), f.registry, new Set(Object.keys(f.tools)), prompt.interfaces)).toThrow('unchanged failed read')
    expect(f.writes).toEqual([f.preface])
  })

  it('feeds back a meaningless revision before dispatch and preserves one failed read plus one repaired read', async () => {
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => {
      const prompt = JSON.parse(user)
      const inventory = prompt.observations.find((item: { stepId: string }) => item.stepId === 'inventory')
      const source = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt').path
      if (generate.mock.calls.length === 1)
        return JSON.stringify({ reason: 'Add a read without repairing its failed prerequisite.', steps: [...prompt.steps, { id: 'other-read', capabilityId: 'tool.filesystem_read_file', input: { path: source }, dependsOn: ['inventory'], acceptanceCriterionIds: [] }] })
      return repair(user, source)
    })
    const f = await fixture(generate)
    await vi.waitFor(async () => {
      expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
      expect(f.runtime.isActive()).toBe(false)
    }, { timeout: 10000 })
    expect(generate).toHaveBeenCalledTimes(2)
    expect(JSON.parse(generate.mock.calls[1][0].user).previousRejections).toEqual([{ attempt: 0, errorMessage: expect.stringContaining('unchanged failed read') }])
    const view = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
    expect(view.execution!.plans[0].revision).toBe(2)
    expect(view.effects.filter(effect => effect.actionId === 'read-note')).toHaveLength(2)
    expect(view.effects.some(effect => effect.actionId === 'other-read')).toBe(false)
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
    expect(f.errors).toHaveBeenCalledOnce()
    expect(isRejectedWorkAdaptation(f.errors.mock.calls[0][0])).toBe(true)
  }, 15000)

  it.each([false, true])('rejects missing input before dispatch and keeps bounded production feedback; always invalid=%s', async (alwaysInvalid) => {
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => {
      const prompt = JSON.parse(user)
      const inventory = prompt.observations.find((item: { stepId: string }) => item.stepId === 'inventory')
      const source = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt').path
      const proposal = JSON.parse(repair(user, source))
      if (alwaysInvalid || generate.mock.calls.length === 1)
        delete proposal.steps.find((step: { id: string }) => step.id === 'read-note').input
      return JSON.stringify(proposal)
    })
    const f = await fixture(generate)
    await vi.waitFor(async () => {
      expect(generate).toHaveBeenCalledTimes(alwaysInvalid ? 3 : 2)
      expect(f.runtime.isActive()).toBe(false)
      expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe(alwaysInvalid ? 'blocked' : 'fulfilled')
    }, { timeout: 10000 })
    expect(JSON.parse(generate.mock.calls[1][0].user).previousRejections).toEqual([{ attempt: 0, errorMessage: expect.stringContaining('input') }])
    const view = await f.db.readLifeState()
    expect(view.execution!.plans[0].revision).toBe(alwaysInvalid ? 1 : 2)
    expect(view.effects.filter(effect => effect.actionId === 'read-note')).toHaveLength(alwaysInvalid ? 1 : 2)
    expect(f.writes).toEqual(alwaysInvalid ? [f.preface] : [f.preface, f.destination])
    expect(f.errors.mock.calls.every(([error]) => isRejectedWorkAdaptation(error))).toBe(true)
    const attempts = view.ingress.filter(item => item.source === 'work-read-repair')
    expect(attempts).toHaveLength(alwaysInvalid ? 3 : 2)
    expect(attempts.every(item => item.status === 'settled')).toBe(true)
    await f.runtime.wakeReady()
    expect(generate).toHaveBeenCalledTimes(alwaysInvalid ? 3 : 2)
  }, 15000)

  it('repairs a later unstarted read binding from real directory receipts and keeps the original writes exact', async () => {
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => {
      const prompt = JSON.parse(user)
      const inventory = prompt.observations.find((item: { stepId: string }) => item.stepId === 'inventory')
      const actual = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt')
      const selection = generate.mock.calls.length === 1 ? 'TBD' : actual.name
      return JSON.stringify({ reason: 'Select the unique real note from the committed directory receipt.', steps: prompt.steps.map((step: { id: string }) => step.id === 'read-note' ? { ...step, input: {}, inputBindings: [{ parameter: 'path', stepId: 'inventory', path: ['entries'], select: { field: 'name', equals: selection, valueField: 'path' } }] } : step) })
    })
    const f = await fixture(generate)
    await vi.waitFor(async () => {
      expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
      expect(f.runtime.isActive()).toBe(false)
    }, { timeout: 10000 })
    expect(generate).toHaveBeenCalledTimes(2)
    const second = JSON.parse(generate.mock.calls[1][0].user)
    expect(second.failedReads).toMatchObject([{ stepId: 'read-note', effectId: null, errorCode: 'WORK_INPUT_BINDING_FAILED', observationRefs: [expect.stringMatching(/^observation:/u)] }])
    expect(second.failedReads[0].errorMessage).toContain('absent or ambiguous')
    const view = await f.db.readLifeState({ executionPlanId: f.accepted.planId })
    expect(view.execution!.plans[0].revision).toBe(3)
    expect(view.effects.filter(effect => effect.actionId === 'read-note')).toHaveLength(2)
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
    expect(f.errors).not.toHaveBeenCalled()
  }, 15000)

  it.each([true, false])('feeds back compiler rejection and bounds automatic retries; always invalid=%s', async (alwaysInvalid) => {
    const generate = vi.fn<WorkAdaptationProvider>(async ({ user }) => {
      const prompt = JSON.parse(user)
      const inventory = prompt.observations.find((item: { stepId: string }) => item.stepId === 'inventory')
      const source = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt').path
      const proposal = JSON.parse(repair(user, source))
      if (alwaysInvalid || generate.mock.calls.length === 1)
        proposal.steps[0].input.content = 'An impermissible rewrite'
      return JSON.stringify(proposal)
    })
    const f = await fixture(generate)
    await vi.waitFor(async () => {
      expect(generate).toHaveBeenCalledTimes(alwaysInvalid ? 3 : 2)
      expect(f.runtime.isActive()).toBe(false)
      expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe(alwaysInvalid ? 'blocked' : 'fulfilled')
    }, { timeout: 10000 })
    expect(JSON.parse(generate.mock.calls[1][0].user).previousRejections).toEqual([{ attempt: 0, errorMessage: 'Adaptive work cannot remove or change the original mutation proposals' }])
    expect(f.writes).toEqual(alwaysInvalid ? [f.preface] : [f.preface, f.destination])
    const markers = (await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')
    expect(markers).toHaveLength(alwaysInvalid ? 3 : 2)
    expect(markers.every(item => item.status === 'settled')).toBe(true)
    await f.runtime.wakeReady()
    expect(generate).toHaveBeenCalledTimes(alwaysInvalid ? 3 : 2)
  }, 15000)

  it('resumes a deferred repair on actual provider release without another host action or a spent model attempt', async () => {
    const f = await fixture()
    const coordinator = createAlicizationMainGatewayWorkCoordinator()
    const busy = coordinator.acquireOneShot({ source: 'dream' })
    if (!busy.accepted)
      throw new Error('Expected the original provider owner')
    const generate = vi.fn<WorkAdaptationProvider>(async (input) => {
      const lease = coordinator.acquireOneShot({ source: 'execution-planning' })
      if (!lease.accepted)
        return null
      try {
        await input.claimAttempt()
        return repair(input.user, f.source)
      }
      finally { lease.release({ status: 'success' }) }
    })
    const broker = createExecutionResourceBroker()
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => f.db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), tools: f.tools, onError: f.errors, planReadRepair: generate })
    const unsubscribe = coordinator.onAvailability(() => { void runtime.wakeReady().catch(f.errors) })
    cleanups.push(async () => { unsubscribe(); await runtime.dispose() })
    await runtime.wakeReady()
    await vi.waitFor(() => {
      expect(runtime.isActive()).toBe(false)
      expect(generate).toHaveBeenCalledOnce()
    })
    expect((await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')).toHaveLength(0)
    busy.release({ status: 'success' })
    await vi.waitFor(async () => {
      expect((await f.db.readLifeState()).obligations.find(item => item.threadId === f.accepted.rootThreadId)?.status).toBe('fulfilled')
      expect(runtime.isActive()).toBe(false)
    }, { timeout: 10000 })
    expect(generate).toHaveBeenCalledTimes(2)
    expect((await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')).toHaveLength(1)
    expect(f.writes).toEqual([f.preface, f.destination])
  })

  it.each(['complete', 'pause', 'cancel'] as const)('projects one committed comparison while the real planner waits, then drains it on %s', async (outcome) => {
    const publish = vi.fn()
    const called = Promise.withResolvers<string>()
    const reply = Promise.withResolvers<string>()
    const generate: WorkAdaptationProvider = async ({ user }) => {
      called.resolve(user)
      return reply.promise
    }
    const f = await fixture(generate, undefined, ({ database, plan, attemptId }) => createLifeExecutionPresenceObserver({ cardId: 'alice', threadId: plan.rootThreadId, attemptId, enabled: () => true, read: async () => {
      const view = await database.readLifeState({ executionPlanId: plan.id })
      const thread = await database.getTaskThread(plan.rootThreadId)
      return { thread, outcome: projectLifeTaskOutcome(view, plan.rootThreadId), work: thread ? deriveExecutionAttention(view, thread) : null }
    }, publish, onError: (error) => { throw error }, now: Date.now }))
    const user = await called.promise
    await vi.waitFor(() => expect(publish.mock.lastCall?.[0].activity).toMatchObject({ phase: 'working', work: { mode: 'comparing', source: 'work-step-ledger' } }))
    const comparing = publish.mock.lastCall![0]
    expect(comparing.activity.work.causeId).toMatch(/^work-replan:/u)
    expect((await f.db.getLifeIngress(comparing.activity.work.causeId))?.status).toBe('processing')
    expect(f.writes).toEqual([f.preface])
    if (outcome !== 'complete')
      await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: `${outcome}-comparing`, action: outcome })
    reply.resolve(repair(user, f.source))
    await vi.waitFor(async () => {
      expect(f.runtime.isActive()).toBe(false)
      expect((await f.db.readLifeState()).obligations.find(item => item.threadId === f.accepted.rootThreadId)?.status).toBe(outcome === 'complete' ? 'fulfilled' : outcome === 'pause' ? 'blocked' : 'cancelled')
    }, { timeout: 10000 })
    expect(publish.mock.lastCall?.[0].activity.work?.mode).not.toBe('comparing')
    expect(publish.mock.lastCall?.[0].activity.phase).toBe(outcome === 'complete' ? 'finished' : outcome === 'pause' ? 'blocked' : 'interrupted')
    expect(f.errors).not.toHaveBeenCalled()
  }, 15000)

  it('does not spend durable model attempts when the provider has not admitted a request', async () => {
    const f = await fixture()
    const generate = vi.fn(async () => null)
    const options = { database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate }
    for (let i = 0; i < 5; i++)
      expect(await invokeWorkAdaptation(options, f.input)).toMatchObject({ state: 'held', reason: 'provider-deferred' })
    expect(generate).toHaveBeenCalledTimes(5)
    expect((await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')).toHaveLength(0)
    expect(f.writes).toEqual([f.preface])
  })

  it('refuses an unadmitted response and a late admission callback without creating an attempt', async () => {
    const f = await fixture()
    let lateClaim: (() => Promise<void>) | undefined
    const generate: WorkAdaptationProvider = async ({ user, claimAttempt }) => {
      lateClaim = claimAttempt
      return repair(user, f.source)
    }
    await expect(invokeWorkAdaptation({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate }, f.input)).rejects.toThrow('requires an admitted')
    await expect(lateClaim!()).rejects.toThrow('admission is closed')
    expect((await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')).toHaveLength(0)
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
  })

  it('settles the exact admission when cancellation wins during its pending database commit', async () => {
    const f = await fixture()
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const commit = f.db.commitLifeState
    vi.spyOn(f.db, 'commitLifeState').mockImplementation(async (input) => {
      if (/^work-replan:[a-f\d]+:0$/u.test(input.operationKey)) {
        entered.resolve()
        await release.promise
      }
      return commit(input)
    })
    const controller = new AbortController()
    const provider = vi.fn(async () => null)
    const pending = adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate: provider }, { ...f.input, signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('Host cancelled during admission')
    await entered.promise
    controller.abort(new DOMException('Host cancelled during admission', 'AbortError'))
    release.resolve()
    await rejected
    expect(provider).not.toHaveBeenCalled()
    const attempts = (await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')
    expect(attempts).toHaveLength(1)
    expect(attempts[0].status).toBe('settled')
    expect(f.writes).toEqual([f.preface])
  })

  it('coalesces active pauses and settles their control markers when the root is cancelled', async () => {
    const f = await fixture()
    for (const requestId of ['first-host-pause', 'second-host-pause'])
      await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId, action: 'pause' })
    const held = () => f.db.readLifeState().then(view => view.ingress.filter(item => item.source === 'work-stop' && item.status === 'held'))
    expect(await held()).toHaveLength(1)
    await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'cancel-paused-root', action: 'cancel' })
    expect(await held()).toHaveLength(0)
    expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('cancelled')
    expect(f.writes).toEqual([f.preface])
  })

  it('retains a pause across unrelated history and database restart, then resumes only on explicit Continue', async () => {
    const f = await fixture()
    await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'durable-host-pause', action: 'pause' })
    for (let batch = 0; batch < 6; batch++) {
      await f.db.commitLifeState({ cardId: 'alice', operationKey: `pause-history:${batch}`, changes: [], mutations: Array.from({ length: 25 }, (_, index) => {
        const id = `pause-unrelated:${batch}:${index}`
        return [
          { type: 'ingress-accept' as const, ingress: { id, kind: 'system' as const, source: 'qa-unrelated', sourceKey: id, occurredAt: Date.now(), payload: {} } },
          { type: 'ingress-settle' as const, id, status: 'settled' as const },
        ]
      }).flat() })
    }
    await f.close()
    const db = await setupAlicizationDb(f.root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const generate = vi.fn(async ({ user }: { user: string }) => repair(user, f.source))
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), tools: f.tools, onError: f.errors, planReadRepair: admittedProvider(generate) })
    cleanups.push(async () => {
      await runtime.dispose()
      await db.close()
    })
    await runtime.wakeReady()
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect(generate).not.toHaveBeenCalled()
    expect(await readWorkAdaptationContext(db, f.input)).toMatchObject({ state: 'held', reason: 'paused-by-host' })
    await runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'explicit-continue-after-restart' })
    await vi.waitFor(async () => {
      expect((await db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('fulfilled')
    }, { timeout: 10000 })
    expect(generate).toHaveBeenCalledTimes(1)
    expect(f.writes).toEqual([f.preface, f.destination])
  }, 15000)

  it('keeps a failed stop fenced until an explicit Continue succeeds', async () => {
    const f = await fixture()
    const commit = f.db.commitLifeState
    const spy = vi.spyOn(f.db, 'commitLifeState').mockImplementation(async input => input.operationKey.startsWith('work-stop:') ? Promise.reject(new Error('Stop persistence unavailable')) : commit(input))
    await expect(f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'failed-durable-stop', action: 'pause' })).rejects.toThrow('Stop persistence unavailable')
    spy.mockRestore()
    await expect(f.runtime.run({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'no-background-resume' })).rejects.toThrow('pending host stop')
    await f.runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'explicit-resume-after-store-restored' })
    await vi.waitFor(() => expect(f.runtime.isActive()).toBe(false))
    expect(f.writes).toEqual([f.preface])
  })

  it('does not silently change the initial repair policy in a plan revision', async () => {
    const f = await fixture()
    const previous = (await f.db.readLifeState()).execution!.plans[0]
    await expect(f.runtime.save({ cardId: 'alice', plan: { ...previous, revision: 2, readRepairPolicy: undefined }, expectedRevision: 1, requestId: 'change-initial-repair-policy' })).rejects.toThrow('read-repair policy')
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(f.writes).toEqual([f.preface])
  })

  it('retains manual continuation for an existing plan without recorded repair policy', async () => {
    const f = await fixture()
    await f.db.upsertTaskThread({ id: 'legacy-read-task', goal: 'An existing task remains under manual control', kind: 'codebase-edit', status: 'planned', metadata: { goalProof: { kind: 'file', path: f.destination, contentHash: 'a'.repeat(64) } } })
    const plan = await f.runtime.singleStepPlan({ cardId: 'alice', threadId: 'legacy-read-task', capabilityId: 'tool.filesystem_read_file', parameters: { path: join(f.root, 'old-missing-file.txt') } })
    expect(plan.readRepairPolicy).toBeUndefined()
    await f.runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'legacy-read-run' })
    expect(await readWorkAdaptationContext(f.db, { ...f.input, planId: plan.id })).toMatchObject({ state: 'held', reason: 'read-repair-policy-unavailable' })
    expect(f.writes).toEqual([f.preface])
  })

  it('keeps a host pause durable instead of treating it as a repairable read failure', async () => {
    const f = await fixture()
    await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'host-pause-failed-read', action: 'pause' })
    const generate = vi.fn(async ({ user }: { user: string }) => repair(user, f.source))
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'held' })
    expect(generate).not.toHaveBeenCalled()
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(f.writes).toEqual([f.preface])
  })

  it('honours a stop from the existing task control after an automatic plan revision', async () => {
    const f = await fixture()
    await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate: async ({ user }) => repair(user, f.source), canApply: () => true }, f.input)
    const entered = Promise.withResolvers<AbortSignal>()
    const original = f.tools['tool.filesystem_read_file']
    f.tools['tool.filesystem_read_file'] = async (input, signal) => {
      if (input.path === f.source) {
        entered.resolve(signal)
        await awaitAlicizationPromiseWithAbort(new Promise(() => {}), signal)
      }
      return original(input, signal)
    }
    await f.runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 2, requestId: 'start-revised-work' })
    const signal = await entered.promise
    await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'stop-from-original-control', action: 'cancel' })
    await vi.waitFor(() => expect(f.runtime.isActive()).toBe(false))
    expect(signal.aborted).toBe(true)
    expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('cancelled')
    expect(f.writes).toEqual([f.preface])
  })

  it.skipIf(process.env.ALICIZATION_RUN_REAL_WORK_REPAIR !== '1')('runs three actual configured-model revisions through real file operations and independent goal verification', async () => {
    const provider = await configuredLifeGeneration()
    const trials: unknown[] = []
    for (let round = 0; round < 3; round++) {
      const beforeCalls = provider.calls()
      // Exercise the production owner, including its existing three-attempt
      // rejection feedback. A direct compiler call cannot represent this loop.
      const f = await fixture(input => provider.generate({ system: input.system, user: input.user, signal: input.signal, judge: false }))
      await vi.waitFor(async () => {
        expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
        expect(f.runtime.isActive()).toBe(false)
      }, { timeout: 135000 })
      expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
      expect(f.writes).toEqual([f.preface, f.destination])
      const view = await f.db.readLifeState()
      const attempts = view.ingress.filter(item => item.source === 'work-read-repair')
      expect(attempts.length).toBeGreaterThanOrEqual(1)
      expect(attempts.length).toBeLessThanOrEqual(3)
      expect(attempts.every(item => item.status === 'settled')).toBe(true)
      expect(provider.calls() - beforeCalls).toBe(attempts.length)
      expect(f.errors.mock.calls.every(([error]) => isRejectedWorkAdaptation(error))).toBe(true)
      trials.push({ round, calls: provider.calls() - beforeCalls, planId: f.accepted.planId, acceptanceHash: view.execution!.plans[0].acceptanceHash, goal: view.obligations.find(goal => goal.threadId === f.accepted.rootThreadId), audit: view.ingress.filter(ingress => ingress.source === 'work-read-repair-result'), writeCount: f.writes.length, realReadEffect: view.effects.find(effect => effect.actionId === 'read-note' && effect.receipt?.outcome === 'success')?.id })
      await f.close()
    }
    expect(provider.calls()).toBeGreaterThanOrEqual(3)
    expect(provider.calls()).toBeLessThanOrEqual(9)
    await mkdir('output', { recursive: true })
    await writeFile(join('output', `work-adaptation-real-model-${randomUUID()}.json`), JSON.stringify({ passed: true, calls: provider.calls(), scope: 'Actual configured model through the production runtime owner and its unchanged bounded rejection feedback, scheduler/action ledger, real synthetic files and independent goal verification; desktop UI and the normal one-shot gateway are separate checks.', trials }, null, 2), { flag: 'wx' })
  }, 420000)

  it('automatically repairs and resumes after the real writer has released ownership', async () => {
    const generate = vi.fn(async ({ user }: { user: string }) => {
      const inventory = JSON.parse(user).observations.find((observation: { stepId: string }) => observation.stepId === 'inventory')
      const selected = inventory.output.structuredContent.entries.find((entry: { name: string }) => entry.name === 'actual-note.txt')
      return repair(user, selected.path)
    })
    const f = await fixture(generate)
    await vi.waitFor(async () => {
      expect((await f.db.readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
    }, { timeout: 10000 })
    expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
    expect(f.writes).toEqual([f.preface, f.destination])
    expect(generate).toHaveBeenCalledTimes(1)
    expect(f.errors).not.toHaveBeenCalled()
  }, 15000)
  it('uses the production scheduler, actual files and ledger; keeps the first write exact and independently fulfils the same root', async () => {
    const f = await fixture()
    const before = await stat(f.preface)
    const context = await ready(f)
    expect(context.failedReads).toMatchObject([{ stepId: 'read-note', errorCode: 'ENOENT' }])
    const generate = vi.fn(async ({ user }: { user: string }) => repair(user, f.source))
    const result = await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)
    expect(result).toMatchObject({ state: 'revised', revision: 2 })
    expect((await f.db.readLifeState()).execution!.plans[0]).toMatchObject({ id: context.plan.id, rootObligationId: context.plan.rootObligationId, acceptanceHash: context.plan.acceptanceHash })
    await f.runtime.start({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 2, requestId: 'resume-repaired' })
    await vi.waitFor(async () => {
      expect((await f.db.readLifeState()).obligations.find(goal => goal.id === context.goal.id)?.status, String(f.errors.mock.calls)).toBe('fulfilled')
    })
    expect(await readFile(f.destination, 'utf8')).toBe('the actual observed note')
    expect((await stat(f.preface)).mtimeMs).toBe(before.mtimeMs)
    expect(f.writes.filter(path => path === f.preface)).toHaveLength(1)
    expect(f.writes.filter(path => path === f.destination)).toHaveLength(1)
    expect((await f.db.readLifeState()).obligations.filter(goal => goal.threadId === f.accepted.rootThreadId)).toHaveLength(1)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(f.errors).not.toHaveBeenCalled()
  })

  it.each(['changed-write', 'new-write', 'changed-verified', 'changed-interface', 'authority-fields', 'duplicate-read'])('rejects %s while preserving the original failed plan and real bytes', async (change) => {
    const f = await fixture()
    const context = await ready(f)
    const prompt = workAdaptationPrompt(context, f.registry, new Set(Object.keys(f.tools)))
    const proposed = JSON.parse(repair(prompt.user, f.source))
    if (change === 'changed-write')
      proposed.steps[3].input.path = join(f.root, 'other.txt')
    if (change === 'duplicate-read')
      proposed.steps.push({ ...proposed.steps[2], input: { path: join(f.root, 'ambiguous.txt') } })
    if (change === 'new-write')
      proposed.steps.push({ ...proposed.steps[3], id: 'extra-write' })
    if (change === 'changed-verified')
      proposed.steps[0].input.content = 'overwritten'
    if (change === 'authority-fields')
      proposed.rootObligationId = 'different-goal'
    if (change === 'changed-interface')
      prompt.interfaces[0].interfaceHash = 'changed'
    expect(() => compileWorkAdaptation(context, JSON.stringify(proposed), f.registry, new Set(Object.keys(f.tools)), prompt.interfaces)).toThrow()
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(await readFile(f.preface, 'utf8')).toBe('Keep this already completed write')
    expect(f.writes).toEqual([f.preface])
  })

  it('rechecks a host stop after the model wait and never applies the stale proposal', async () => {
    const f = await fixture()
    const options = { database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate: async ({ user }: { user: string }) => {
      await f.runtime.stop({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, requestId: 'host-cancel-during-repair', action: 'cancel' })
      return repair(user, f.source)
    } }
    expect(await adaptExecutionWork(options, f.input)).toMatchObject({ state: 'held', reason: 'context-changed' })
    const view = await f.db.readLifeState()
    expect(view.execution!.plans[0].revision).toBe(1)
    expect(view.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('cancelled')
    expect(f.writes).toEqual([f.preface])
  })

  it('persists a three-attempt budget through separate planner invocations', async () => {
    const f = await fixture()
    const generate = vi.fn(async () => null)
    const options = { database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate }
    for (let i = 0; i < 3; i++) expect(await adaptExecutionWork(options, f.input)).toMatchObject({ reason: 'provider-unavailable' })
    expect(await adaptExecutionWork(options, f.input)).toMatchObject({ reason: 'adaptation-budget-exhausted' })
    expect(generate).toHaveBeenCalledTimes(3)
    expect((await f.db.readLifeState()).ingress.filter(item => item.source === 'work-read-repair')).toHaveLength(3)
    expect(f.writes).toEqual([f.preface])
  })

  it('permits one model owner and rejects a late result after cancellation', async () => {
    const f = await fixture()
    const reply = Promise.withResolvers<string>()
    const called = Promise.withResolvers<void>()
    let request = ''
    const generate = vi.fn(async ({ user }: { user: string }) => {
      request = user
      called.resolve()
      return reply.promise
    })
    const options = { database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), canApply: () => true, generate }
    const controller = new AbortController()
    const pending = adaptExecutionWork(options, { ...f.input, signal: controller.signal })
    await called.promise
    expect(await adaptExecutionWork(options, f.input)).toMatchObject({ state: 'held', reason: 'adaptation-already-active' })
    controller.abort(new DOMException('Host cancelled', 'AbortError'))
    await expect(pending).rejects.toThrow('Host cancelled')
    reply.resolve(repair(request, f.source))
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(f.writes).toEqual([f.preface])
  })

  it.each(['host-denied', 'system-denied', 'unknown-write', 'literal'] as const)('holds %s without calling a model or replaying a real write', async (fault) => {
    const f = await fixture(undefined, fault)
    const generate = vi.fn(async ({ user }: { user: string }) => repair(user, f.source))
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'held' })
    expect(generate).not.toHaveBeenCalled()
    expect(f.writes).toEqual([f.preface])
    expect(await readFile(f.preface, 'utf8')).toBe('Keep this already completed write')
  })

  it('rejects source withdrawal during the provider wait', async () => {
    const f = await fixture()
    const generate = async ({ user }: { user: string }) => {
      const source = await f.db.getLifeIngress('user:repair-request')
      await f.db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-read-repair-source', changes: [], mutations: [{ type: 'ingress-settle', id: source!.id, status: 'failed', expectedStatus: source!.status }] })
      return repair(user, f.source)
    }
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'held', reason: 'context-changed' })
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(f.writes).toEqual([f.preface])
  })

  it('preserves a host revision made while the model was planning', async () => {
    const f = await fixture()
    const generate = async ({ user }: { user: string }) => {
      await f.runtime.revise({ cardId: 'alice', planId: f.accepted.planId, expectedRevision: 1, stepId: 'read-note', requestId: 'host-read-revision', changes: { path: f.source } })
      return repair(user, f.source)
    }
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'held', reason: 'context-changed' })
    const plan = (await f.db.readLifeState()).execution!.plans[0]
    expect(plan.revision).toBe(2)
    expect(plan.steps.find(step => step.id === 'read-note')?.input.path).toBe(f.source)
    expect(f.writes).toEqual([f.preface])
  })

  it('rebases an unrelated life event once without a second model request', async () => {
    const f = await fixture()
    const originalCommit = f.db.commitLifeState
    let clockChanged = false
    vi.spyOn(f.db, 'commitLifeState').mockImplementation(async (input) => {
      if (!clockChanged && input.operationKey.endsWith(':apply')) {
        clockChanged = true
        await originalCommit({ cardId: 'alice', operationKey: 'unrelated-qa-life-event', changes: [], mutations: [
          { type: 'ingress-accept', ingress: { id: 'unrelated-qa-event', kind: 'system', source: 'qa-clock', sourceKey: 'unrelated-clock', occurredAt: Date.now(), payload: {} } },
          { type: 'ingress-settle', id: 'unrelated-qa-event', status: 'settled' },
        ] })
      }
      return originalCommit(input)
    })
    const generate = vi.fn(async ({ user }: { user: string }) => repair(user, f.source))
    expect(await adaptExecutionWork({ database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }, f.input)).toMatchObject({ state: 'revised', revision: 2 })
    expect(clockChanged).toBe(true)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(f.writes).toEqual([f.preface])
  })

  it('expires a crashed planning owner and atomically refuses its late proposal', async () => {
    const f = await fixture()
    const reply = Promise.withResolvers<string>()
    const called = Promise.withResolvers<void>()
    let request = ''
    const generate = async ({ user }: { user: string }) => {
      request = user
      called.resolve()
      return reply.promise
    }
    const options = { database: f.db, registry: () => f.registry, tools: new Set(Object.keys(f.tools)), generate, canApply: () => true }
    const pending = adaptExecutionWork(options, f.input)
    await called.promise
    const later = Date.now() + 90001
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later)
    try {
      expect(await adaptExecutionWork(options, f.input)).toMatchObject({ state: 'held', reason: 'expired-planning-owner-cleared' })
    }
    finally { clock.mockRestore() }
    reply.resolve(repair(request, f.source))
    await expect(pending).rejects.toThrow('Input changed')
    expect((await f.db.readLifeState()).execution!.plans[0].revision).toBe(1)
    expect(f.writes).toEqual([f.preface])
  })
})
