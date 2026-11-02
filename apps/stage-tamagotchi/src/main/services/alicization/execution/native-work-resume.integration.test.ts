import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { executionWorkAcknowledgment } from './work-acknowledgment'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

async function fixture(fault = '') {
  const root = await mkdtemp(join(tmpdir(), 'life-native-work-resume-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  const delivered = join(root, 'already-delivered.txt')
  const marker = join(root, 'menu-marker.txt')
  const errors: unknown[] = []
  const calls: string[] = []
  let foreground = false
  let stale = false
  const typing = fault.startsWith('type-')
  const fieldRole = fault === 'type-foreground' ? 'select' : 'input'
  const operation = typing ? 'desktop_type_text' : 'desktop_click_element'
  const original = { windowId: '2400', processId: 120, processStartTicks: '638930000000000000', windowClass: 'OwnedWpfWindow', desktop: 'Default', title: 'Current exact owned menu', ownerWindowId: null }
  const current: Record<string, unknown> = { ...original }
  const make = () => {
    const broker = createExecutionResourceBroker()
    return createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: card => card === 'alice', canContinue: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: {
      'tool.filesystem_write_file': async (input) => { calls.push('write'); await writeFile(String(input.path), String(input.content), { flag: 'wx' }); return { ok: true } },
      'tool.desktop_list_interactables': async () => { calls.push('read'); stale = false; return { ok: true, channel: 'desktop', operation: 'desktop_list_interactables', ...current, focusWindowId: foreground ? current.windowId : 'other-window', elements: [{ role: typing ? fieldRole : 'menu-item', name: 'Owned file options', runtimeId: foreground ? 'fresh-menu' : 'original-menu' }, { role: 'text', name: 'Owned file options', runtimeId: 'caption' }] } },
      [`tool.${operation}`]: async (input) => {
        calls.push(typing ? 'type' : 'click')
        expect(input).toMatchObject(typing ? { windowTitle: original.title, targetText: 'Owned file options', role: fieldRole, text: 'new owned content' } : { windowTitle: original.title, text: 'Owned file options', role: 'menu-item', exactText: true })
        if (stale)
          return { ok: false, channel: 'desktop', operation, errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED', effectMayHaveOccurred: false, sideEffectState: 'none' }
        stale = true
        if (!foreground && fault.includes('observation'))
          return { ok: false, channel: 'desktop', operation, errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED', sideEffectState: 'none' }
        if (!foreground)
          return { ok: false, channel: 'desktop', operation, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: fault === 'unknown', sideEffectState: fault === 'unknown' ? 'unknown' : 'none' }
        await writeFile(marker, 'independent owned menu receipt', { flag: 'wx' })
        return { ok: true, status: 'completed' }
      },
    } })
  }
  let runtime = make()
  await createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now }).admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '先保存成果，然后在当前明确指定的窗口操作菜单；只允许继续同一份工作。' }] }, new AbortController().signal)
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Keep the first delivery and finish the exact native menu', criteria: [{ id: 'marker', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: marker, includes: ['independent owned menu receipt'] } }], steps: [
    { id: 'delivered', capabilityId: 'tool.filesystem_write_file', input: { path: delivered, content: 'preserved once' }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'read', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: original.title, maxItems: 120 }, dependsOn: ['delivered'], acceptanceCriterionIds: [] },
    { id: 'menu', capabilityId: `tool.${operation}`, input: typing ? { windowTitle: original.title, targetText: '@observed', role: fieldRole, text: 'new owned content', clearExisting: true } : { windowTitle: original.title, text: fault.startsWith('literal') ? 'Owned file options' : '@observed', role: 'menu-item', exactText: true }, ...(fault.startsWith('literal') ? {} : { inputBindings: [{ parameter: typing ? 'targetText' : 'text', stepId: 'read', path: ['elements'], select: { field: 'name', equals: 'Owned file options', valueField: 'name' } }] }), dependsOn: ['read'], acceptanceCriterionIds: ['marker'] },
  ] })
  await vi.waitFor(() => expect(runtime.isActive()).toBe(false), { timeout: 10000 })
  const before = await db.readLifeState({ executionPlanId: accepted.planId })
  const plan = before.execution!.plans[0]
  const first = before.execution!.results.find(result => result.stepId === 'delivered')!
  const mtime = (await stat(delivered)).mtimeMs
  return {
    root,
    marker,
    calls,
    errors,
    accepted,
    before,
    plan,
    first,
    mtime,
    delivered,
    db: () => db,
    runtime: () => runtime,
    allow: () => { foreground = true },
    replace: (key: string, value: unknown) => { current[key] = value },
    reopen: async () => { await runtime.dispose(); await db.close(); db = await setupAlicizationDb(root, { cardId: 'alice' }); runtime = make() },
    close: async () => { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) },
  }
}

it.each(['foreground', 'observation', 'literal-foreground', 'literal-observation', 'type-observation', 'type-foreground'])('refreshes the same native window on explicit host continuation after reopening, without replaying a verified write: %s', async (fault) => {
  const f = await fixture(fault)
  try {
    const action = fault.startsWith('type-') ? 'type' : 'click'
    expect(f.calls).toEqual(['write', 'read', action])
    expect(f.before.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('blocked')
    const goal = f.before.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)!
    expect(executionWorkAcknowledgment(f.before, goal)?.blocker).toMatchObject({ reason: fault.includes('observation') ? 'observation-required' : 'foreground-required', stepId: 'menu', canResume: true })
    await f.reopen()
    f.allow()
    await f.runtime().wakeReady()
    expect(f.calls).toEqual(['write', 'read', action])
    const input = { cardId: 'alice', planId: f.plan.id, expectedRevision: 1, requestId: 'host-native-continue' }
    const first = f.runtime().start(input)
    expect(f.runtime().start(input)).toBe(first)
    expect(await first).toEqual({ state: 'accepted' })
    await vi.waitFor(async () => expect((await f.db().readLifeState()).obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('fulfilled'), { timeout: 10000 })
    await vi.waitFor(() => expect(f.runtime().isActive()).toBe(false))
    const after = await f.db().readLifeState({ executionPlanId: f.plan.id })
    const next = after.execution!.plans[0]
    expect(next).toMatchObject({ id: f.plan.id, revision: 2, rootObligationId: f.plan.rootObligationId, obligationGeneration: f.plan.obligationGeneration, acceptanceHash: f.plan.acceptanceHash })
    expect(f.calls).toEqual(['write', 'read', action, 'read', action])
    expect(after.execution!.results.find(result => result.planRevision === 2 && result.stepId === 'delivered')?.effectId).toBe(f.first.effectId)
    expect((await stat(f.delivered)).mtimeMs).toBe(f.mtime)
    expect(await readFile(f.marker, 'utf8')).toBe('independent owned menu receipt')
    expect((await f.db().getLifeIngress('work-native-reobserve:host-native-continue'))?.source).toBe('execution-native-reobserve')
    expect(await f.runtime().start(input)).toEqual({ state: 'already-accepted' })
    await expect(f.runtime().start({ ...input, expectedRevision: 2 })).rejects.toThrow(/identifier|parameters/u)
    expect(f.errors).toEqual([])
  }
  finally { await f.close() }
}, 30000)

it.each([
  ['windowId', '2401'],
  ['processId', 121],
  ['processStartTicks', '638930000000000001'],
  ['windowClass', 'ReplacementWindow'],
  ['desktop', 'OtherDesktop'],
  ['ownerWindowId', 'another-owner'],
  ['title', 'Replacement title'],
])('refuses a replacement native %s before replaying the action', async (key, value) => {
  const f = await fixture()
  try {
    f.allow()
    f.replace(String(key), value)
    await f.runtime().start({ cardId: 'alice', planId: f.plan.id, expectedRevision: 1, requestId: `replace-${key}` })
    await vi.waitFor(() => expect(f.runtime().isActive()).toBe(false), { timeout: 10000 })
    expect(f.calls).toEqual(['write', 'read', 'click', 'read'])
    await expect(readFile(f.marker)).rejects.toMatchObject({ code: 'ENOENT' })
    const state = await f.db().readLifeState({ executionPlanId: f.plan.id })
    expect(state.obligations.find(goal => goal.threadId === f.accepted.rootThreadId)?.status).toBe('blocked')
    const guard = state.execution!.results.find(result => result.planRevision === 2 && result.state === 'blocked')!
    expect((await f.db().getLifeEffect(guard.effectId!))?.receipt?.output).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', effectMayHaveOccurred: false, sideEffectState: 'none' })
    expect(f.calls.filter(call => call === 'write')).toHaveLength(1)
  }
  finally { await f.close() }
}, 30000)

it.each(['stale-revision', 'wrong-card', 'withdrawn', 'unknown'])('does not resume or reobserve when the responsibility is %s', async (fault) => {
  const f = await fixture(fault)
  try {
    f.allow()
    if (fault === 'withdrawn') {
      const goal = (await f.db().readLifeState()).obligations.find(goal => goal.id === f.plan.rootObligationId)!
      await f.db().commitLifeState({ cardId: 'alice', operationKey: 'withdraw-source', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'cancelled' }] })
    }
    const attempt = f.runtime().start({ cardId: fault === 'wrong-card' ? 'other' : 'alice', planId: f.plan.id, expectedRevision: fault === 'stale-revision' ? 2 : 1, requestId: `refuse-${fault}` })
    if (fault === 'unknown')
      expect(await attempt).toEqual({ state: 'reconciliation-required' })
    else
      await expect(attempt).rejects.toThrow()
    await vi.waitFor(() => expect(f.runtime().isActive()).toBe(false), { timeout: 10000 })
    expect(f.calls).toEqual(['write', 'read', 'click'])
    await expect(readFile(f.marker)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
}, 30000)
