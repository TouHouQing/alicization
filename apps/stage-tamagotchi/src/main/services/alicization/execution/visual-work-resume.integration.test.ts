import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { errorMessageFrom } from '@moeru/std'
import { expect, it, vi } from 'vitest'

import { executionWorkBlocker } from '../../../../shared/execution-work-blocker'
import { visualWorkObservationSource, visualWorkRefusalReason } from '../../../../shared/visual-work-observation'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { assertActionDispatchCurrent } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { assertWindowsVisualWorkWindow } from './windows-visual-work-source'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

// Real life/governance/database/goal verification; the device port is controlled.
// These cases do not claim physical mouse delivery or actual screenshots.
async function fixture(fault = 'foreground') {
  const root = await mkdtemp(join(tmpdir(), 'life-visual-work-resume-'))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  const delivered = join(root, 'preserved.txt')
  const marker = join(root, 'verified-result.txt')
  const calls: string[] = []
  const errors: unknown[] = []
  const owner = { windowId: '2400', processId: 120, processStartTicks: '638930000000000000', windowClass: 'OwnedVisualWindow', desktop: 'Default', title: 'Owned visual work', ownerWindowId: null }
  const current: Record<string, unknown> = { ...owner }
  let allowed = false
  let images = 0
  let latestImage = ''
  const make = () => {
    const broker = createExecutionResourceBroker()
    return createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: card => card === 'alice', canContinue: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), toolRegistry: () => createCanonicalToolRegistry({ platform: 'win32', windowsVisualReady: true }), onError: error => errors.push(error), tools: {
      'tool.filesystem_write_file': async (input) => {
        calls.push('write')
        await writeFile(String(input.path), String(input.content), { flag: 'wx' })
        return { ok: true }
      },
      'tool.desktop_list_interactables': async () => {
        calls.push('read')
        return { ok: true, channel: 'desktop', operation: 'desktop_list_interactables', ...current, elements: [] }
      },
      'tool.desktop_locate_window': async () => {
        calls.push('locate')
        const authority = await assertActionDispatchCurrent(false)
        const observed = fault === 'foreign-window' ? { ...owner, windowId: '2401' } : fault === 'foreign-owner' ? { ...owner, ownerWindowId: '2402' } : fault === 'foreign-birth' ? { ...owner, processStartTicks: '638930000000000001' } : owner
        await assertWindowsVisualWorkWindow(db, 'alice', { effectId: authority!.effectId!, turnId: authority!.turnId!, window: observed })
        if (!allowed && ['locate', 'offscreen', 'provider-busy'].includes(fault))
          return { ok: false, channel: 'desktop', operation: 'desktop_locate_window', errorCode: fault === 'provider-busy' ? 'WINDOWS_VISUAL_GROUNDING_UNAVAILABLE' : fault === 'offscreen' ? 'WINDOWS_VISUAL_POINT_OUTSIDE_VISIBLE_DISPLAY' : 'WINDOWS_VISUAL_SOURCE_IMAGE_CHANGED_DURING_GROUNDING', effectMayHaveOccurred: false, sideEffectState: 'none' }
        images++
        latestImage = `visual-window:${randomUUID()}`
        return { ok: true, channel: 'desktop', operation: 'desktop_locate_window', ...owner, observationId: latestImage }
      },
      'tool.desktop_pointer_action': async (input) => {
        calls.push('pointer')
        const authority = await assertActionDispatchCurrent(true)
        await assertWindowsVisualWorkWindow(db, 'alice', { effectId: authority!.effectId!, turnId: authority!.turnId!, window: owner, observationId: String(input.observationId) })
        expect(input.observationId).toBe(latestImage)
        if (!allowed)
          return { ok: false, channel: 'desktop', operation: 'desktop_pointer_action', errorCode: fault === 'expired' ? 'WINDOWS_VISUAL_OBSERVATION_UNAVAILABLE' : fault === 'native-preflight' ? 'WINDOWS_POINTER_OBSERVATION_CHANGED' : 'WINDOWS_VISUAL_APPROVED_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: fault === 'unknown', sideEffectState: fault === 'unknown' ? 'unknown' : 'none' }
        expect(images).toBe(['locate', 'offscreen', 'provider-busy'].includes(fault) ? 1 : 2)
        await writeFile(marker, 'independently verified controlled port result', { flag: 'wx' })
        return { ok: true, status: 'completed' }
      },
    } })
  }
  let runtime = make()
  await createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now }).admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '保留一次写入，然后在明确的原窗口内重新观察图像并完成指定操作。' }] }, new AbortController().signal)
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Preserve the delivery and renew the exact reviewed visual target', criteria: [{ id: 'result', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: marker, includes: ['independently verified controlled port result'] } }], steps: [
    { id: 'delivered', capabilityId: 'tool.filesystem_write_file', input: { path: delivered, content: 'written exactly once' }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'read', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: owner.title }, dependsOn: ['delivered'], acceptanceCriterionIds: [] },
    { id: 'locate', capabilityId: 'tool.desktop_locate_window', input: { windowTitle: owner.title, targets: ['owned button'] }, dependsOn: ['read'], acceptanceCriterionIds: [] },
    { id: 'pointer', capabilityId: 'tool.desktop_pointer_action', input: { kind: 'click', button: 'left', targetIndex: 0 }, inputBindings: [{ parameter: 'observationId', stepId: 'locate', path: ['observationId'] }], dependsOn: ['locate'], acceptanceCriterionIds: ['result'] },
  ] })
  await vi.waitFor(() => expect(runtime.isActive()).toBe(false), { timeout: 10_000 })
  const view = await db.readLifeState()
  const plan = view.execution!.plans.find(plan => plan.rootThreadId === accepted.rootThreadId)!
  const first = view.execution!.results.find(result => result.planId === plan.id && result.stepId === 'delivered')!
  const mtime = (await stat(delivered)).mtimeMs
  return { calls, errors, plan, first, mtime, delivered, marker, db: () => db, runtime: () => runtime, allow: () => { allowed = true }, replace: (key: string, value: unknown) => { current[key] = value }, reopen: async () => { await runtime.dispose(); await db.close(); db = await setupAlicizationDb(root, { cardId: 'alice' }); runtime = make() }, close: async () => { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) } }
}

it.each(['foreground', 'expired', 'locate', 'native-preflight', 'offscreen', 'provider-busy'])('renews actual work evidence after restart without replaying an already verified write: %s', async (fault) => {
  const f = await fixture(fault)
  try {
    expect(f.errors, f.errors.map(errorMessageFrom).join('\n')).toEqual([])
    const before = await f.db().readLifeState()
    expect(executionWorkBlocker(before, f.plan)).toMatchObject({ reason: fault === 'foreground' ? 'foreground-required' : fault === 'provider-busy' ? 'provider-unavailable' : 'observation-required', canResume: true })
    f.allow()
    await f.reopen()
    await f.runtime().start({ cardId: 'alice', planId: f.plan.id, expectedRevision: 1, requestId: `continue-${fault}` })
    await vi.waitFor(async () => expect((await f.db().readLifeState()).obligations.find(goal => goal.id === f.plan.rootObligationId)?.status).toBe('fulfilled'), { timeout: 10_000 })
    await vi.waitFor(() => expect(f.runtime().isActive()).toBe(false))
    const after = await f.db().readLifeState({ executionPlanId: f.plan.id })
    expect(after.execution!.plans[0]).toMatchObject({ id: f.plan.id, revision: 2, rootObligationId: f.plan.rootObligationId, acceptanceHash: f.plan.acceptanceHash })
    expect(after.execution!.results.find(result => result.planRevision === 2 && result.stepId === 'delivered')?.effectId).toBe(f.first.effectId)
    expect((await stat(f.delivered)).mtimeMs).toBe(f.mtime)
    expect(f.calls).toEqual(['locate', 'offscreen', 'provider-busy'].includes(fault) ? ['write', 'read', 'locate', 'read', 'locate', 'pointer'] : ['write', 'read', 'locate', 'pointer', 'read', 'locate', 'pointer'])
    expect(f.errors).toEqual([])
  }
  finally { await f.close() }
}, 30_000)

it.each([['windowId', '2401'], ['processStartTicks', '638930000000000001'], ['ownerWindowId', 'another-owner']])('refuses replacement %s before renewing or replaying a visual action', async (key, value) => {
  const f = await fixture()
  try {
    f.allow()
    f.replace(String(key), value)
    await f.runtime().start({ cardId: 'alice', planId: f.plan.id, expectedRevision: 1, requestId: `changed-${key}` })
    await vi.waitFor(() => expect(f.runtime().isActive()).toBe(false), { timeout: 10_000 })
    expect(f.calls).toEqual(['write', 'read', 'locate', 'pointer', 'read'])
    await expect(readFile(f.marker)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
}, 30_000)

it('does not renew an image or replay when the prior pointer effect is uncertain', async () => {
  const f = await fixture('unknown')
  try {
    f.allow()
    expect(await f.runtime().start({ cardId: 'alice', planId: f.plan.id, expectedRevision: 1, requestId: 'unknown-no-replay' })).toEqual({ state: 'reconciliation-required' })
    expect(f.calls).toEqual(['write', 'read', 'locate', 'pointer'])
    await expect(readFile(f.marker)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
}, 30_000)

it.each(['foreign-window', 'foreign-owner', 'foreign-birth'])('does not capture a foreign last observation with the same accepted title: %s', async (fault) => {
  const f = await fixture(fault)
  try {
    expect(f.calls).toEqual(['write', 'read', 'locate'])
    expect(f.errors.map(errorMessageFrom)).toContain('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
    expect((await f.db().readLifeState()).obligations.find(goal => goal.id === f.plan.rootObligationId)?.status).not.toBe('fulfilled')
    await expect(readFile(f.marker)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(f.delivered, 'utf8')).toBe('written exactly once')
  }
  finally { await f.close() }
}, 30_000)

it('requires one verified accepted dependency path before offering image renewal', async () => {
  const f = await fixture()
  try {
    const view = await f.db().readLifeState({ executionPlanId: f.plan.id })
    const original = view.execution!.results
    expect(visualWorkObservationSource(f.plan, f.plan.steps.find(step => step.id === 'pointer')!, original)?.window.id).toBe('read')
    for (const fault of ['missing-read', 'missing-locate', 'wrong-binding', 'unverified', 'foreign-plan', 'wrong-input', 'cycle', 'ambiguous']) {
      const plan = structuredClone(f.plan)
      const results = structuredClone(original)
      const read = plan.steps.find(step => step.id === 'read')!
      const locate = plan.steps.find(step => step.id === 'locate')!
      const pointer = plan.steps.find(step => step.id === 'pointer')!
      const source = results.find(result => result.stepId === 'read')!
      if (fault === 'missing-read')
        locate.dependsOn = []
      if (fault === 'missing-locate')
        pointer.dependsOn = ['read']
      if (fault === 'wrong-binding')
        pointer.inputBindings![0].path = ['unownedImage']
      if (fault === 'unverified')
        source.state = 'blocked'
      if (fault === 'foreign-plan')
        source.planId = 'foreign-plan'
      if (fault === 'wrong-input')
        source.inputHash = 'different-input'
      if (fault === 'cycle')
        read.dependsOn = ['locate']
      if (fault === 'ambiguous') {
        plan.steps.push({ ...read, id: 'other-read', dependsOn: [] })
        results.push({ ...source, stepId: 'other-read' })
        locate.dependsOn.push('other-read')
      }
      expect(visualWorkObservationSource(plan, pointer, results), fault).toBeNull()
    }
  }
  finally { await f.close() }
}, 30_000)

it.each(['ALICIZATION_TOOL_DENIED_BY_HOST', 'WINDOWS_VISUAL_ACTION_AUTHORITY_CHANGED', 'WINDOWS_VISUAL_OWNER_CHANGED'])('does not turn %s into an automatic image renewal', (errorCode) => {
  expect(visualWorkRefusalReason({ ok: false, channel: 'desktop', sideEffectState: 'none', effectMayHaveOccurred: false, errorCode })).toBeNull()
})
