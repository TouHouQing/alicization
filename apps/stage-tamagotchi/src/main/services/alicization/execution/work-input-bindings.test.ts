import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { resolveWorkInput, workInputHash } from './work-input-bindings'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { validateWorkPlan } from './work-plan-repository'
import { normalizeWorkProposal } from './work-plan-tool'

describe('accepted work observation bindings', () => {
  it('compiles receipt data edges and the directory envelope while retaining graph validation', async () => {
    const proposal = normalizeWorkProposal({ goal: 'Read the observed file', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Is it useful?', artifactIds: [] } }], steps: [
      { id: 'inventory', capabilityId: 'tool.filesystem_list_directory', input: { path: 'C:/owned' }, dependsOn: [] },
      { id: 'earlier', capabilityId: 'tool.filesystem_read_file', input: { path: 'C:/owned/known.txt' }, dependsOn: [] },
      { id: 'read', capabilityId: 'tool.filesystem_read_file', input: {}, dependsOn: ['earlier'], inputBindings: [{ parameter: 'path', stepId: 'inventory', path: ['entries'], select: { field: 'name', equals: 'actual.txt', valueField: 'path' } }] },
    ] })
    const declaration = proposal.steps[2]
    expect(declaration.dependsOn).toEqual(['earlier', 'inventory'])
    expect(declaration.inputBindings![0].path).toEqual(['structuredContent', 'entries'])
    const step = { ...declaration, inputHash: workInputHash(declaration), resourceIds: [], retryMode: 'read-only' as const, state: 'pending' as const, attemptId: null }
    expect(await resolveWorkInput(step, async () => ({ structuredContent: { entries: [{ name: 'actual.txt', path: 'C:/owned/actual.txt' }] } }))).toEqual({ path: 'C:/owned/actual.txt' })
    // Graph checks run after lowering: a data edge cannot smuggle a missing
    // node or a dependency cycle past plan admission.
    const steps = proposal.steps.map(item => ({ ...item, inputHash: workInputHash(item), resourceIds: [], retryMode: 'read-only' as const, state: 'pending' as const, attemptId: null }))
    const plan = { id: 'plan', cardId: 'alice', rootThreadId: 'thread', rootObligationId: 'goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'a'.repeat(64), sourceEvidenceRefs: ['source'], steps }
    const contract = { contractHash: plan.acceptanceHash, cardId: plan.cardId, rootObligationId: plan.rootObligationId, obligationGeneration: plan.obligationGeneration, criteria: proposal.criteria }
    expect(() => validateWorkPlan(plan as Parameters<typeof validateWorkPlan>[0], contract as Parameters<typeof validateWorkPlan>[1])).not.toThrow()
    expect(() => validateWorkPlan({ ...plan, steps: steps.map(item => item.id === 'inventory' ? { ...item, dependsOn: ['read'] } : item) } as Parameters<typeof validateWorkPlan>[0], contract as Parameters<typeof validateWorkPlan>[1])).toThrow()
    expect(() => validateWorkPlan({ ...plan, steps: steps.map(item => item.id === 'read' ? { ...item, dependsOn: ['absent'] } : item) } as Parameters<typeof validateWorkPlan>[0], contract as Parameters<typeof validateWorkPlan>[1])).toThrow()
  })

  it('takes exactly one observed MCP text block for file-copy shorthand and refuses ambiguous or absent text', async () => {
    const proposal = normalizeWorkProposal({ goal: 'Copy the exact observed text', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Is the copy useful?', artifactIds: [] } }], steps: [
      { id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path: 'C:/owned/source.txt' }, dependsOn: [] },
      { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: 'C:/owned/result.txt' }, dependsOn: ['read'], inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }] },
    ] })
    const declaration = proposal.steps[1]
    const step = { ...declaration, inputHash: workInputHash(declaration), resourceIds: [], retryMode: 'reconcile-first' as const, state: 'pending' as const, attemptId: null }
    const text = 'Actual text\r\n中文🙂'
    expect(await resolveWorkInput(step, async () => ({ content: [{ type: 'text', text }] }))).toEqual({ path: 'C:/owned/result.txt', content: text })
    for (const content of [[], [{ type: 'image', text }], [{ type: 'text', text }, { type: 'text', text: 'other' }]])
      await expect(resolveWorkInput(step, async () => ({ content }))).rejects.toThrow('absent or ambiguous')
  })

  it.each([{ placeholder: true, valid: true }, { placeholder: false, valid: true }, { placeholder: false, valid: false }])('binds committed observations and checks complete input before actual dispatch: %j', async ({ placeholder, valid }) => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-work-binding-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const observed = `Actual observation ${randomUUID()}`
    const path = join(directory, 'result.txt')
    const write = vi.fn(async (input: Record<string, unknown>) => { await writeFile(String(input.path), String(input.content)); return { ok: true } })
    const errors = vi.fn()
    const runtime = createWorkPlanExecutionRuntime({ captureBrowserBinding: () => ({ kind: 'managed', id: 'unit-browser' }), isBrowserBindingCurrent: binding => binding?.kind === 'managed' && binding.id === 'unit-browser', getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: errors, tools: { 'tool.browser_read_page': async () => ({ ok: true, elements: [{ text: 'Chosen field', value: valid ? observed : [observed] }, { text: 'Other field', value: 'unrelated' }] }), 'tool.filesystem_write_file': write } })
    try {
      await createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now }).admit({ cardId: 'alice', turnId: 'request', conversationId: 'qa', messages: [{ role: 'user', content: 'Save the chosen field exactly' }] }, new AbortController().signal)
      const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Save the chosen observed field', criteria: [{ id: 'actual-content', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: [observed] } }], steps: [
        { id: 'observe', dependsOn: [], capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, acceptanceCriterionIds: [] },
        { id: 'save', dependsOn: ['observe'], capabilityId: 'tool.filesystem_write_file', input: { path, ...(placeholder ? { content: '@observed' } : {}) }, inputBindings: [{ parameter: 'content', stepId: 'observe', path: ['elements'], select: { field: 'text', equals: 'Chosen field', valueField: 'value' } }], acceptanceCriterionIds: ['actual-content'] },
      ] })
      await vi.waitFor(async () => {
        const view = await db.readLifeState()
        expect(view.obligations.find(item => item.threadId === accepted.rootThreadId)?.status, JSON.stringify({ errors: errors.mock.calls.map(call => String(call[0])), results: view.execution?.results, goal: view.obligations.find(item => item.threadId === accepted.rootThreadId) })).toBe(valid ? 'fulfilled' : 'blocked')
      }, { timeout: 10000 })
      if (!valid) {
        expect(write).not.toHaveBeenCalled()
        await expect(readFile(path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
        expect((await db.readLifeState()).effects.some(effect => effect.actionId === 'save')).toBe(false)
        return
      }
      expect(await readFile(path, 'utf8')).toBe(observed)
      expect(write).toHaveBeenCalledTimes(1)
      expect((await db.readLifeState()).obligations.find(item => item.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
      const plan = (await db.readLifeState()).execution!.plans[0]
      const step = plan.steps.find(item => item.id === 'save')!
      expect(step.input.content).toBe(placeholder ? '@observed' : undefined)
      expect(step.inputHash).toBe(workInputHash(step))
      const effects = (await db.readLifeState()).effects
      expect(effects.find(item => item.actionId === 'save')?.payload.parameters).toEqual({ path, content: observed })
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  })

  it('rejects ambiguous observations, missing dependencies, reserved paths and overwritten bindings', async () => {
    const step = { id: 'act', dependsOn: ['observe'], capabilityId: 'click', input: { selector: '@observed' }, inputHash: '', inputBindings: [{ parameter: 'selector', stepId: 'observe', path: ['elements'], select: { field: 'text', equals: 'Save', valueField: 'selector' } }], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first' as const, state: 'pending' as const, attemptId: null }
    const source = async () => ({ elements: [{ text: 'Save', selector: 'first' }, { text: 'Save', selector: 'second' }] })
    await expect(resolveWorkInput(step, source)).rejects.toThrow('ambiguous')
    await expect(resolveWorkInput({ ...step, dependsOn: [] }, source)).rejects.toThrow('accepted dependency')
    await expect(resolveWorkInput({ ...step, inputBindings: [{ ...step.inputBindings[0], path: ['constructor'] }] }, source)).rejects.toThrow('reserved')
    await expect(resolveWorkInput({ ...step, inputBindings: [step.inputBindings[0], step.inputBindings[0]] }, async () => ({ elements: [{ text: 'Save', selector: 'actual' }] }))).rejects.toThrow('unique')
  })
})
