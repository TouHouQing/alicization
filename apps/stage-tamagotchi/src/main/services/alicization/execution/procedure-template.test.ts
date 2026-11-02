import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { CapabilityManifest } from '../turn-os/tool-registry'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { admitVerifiedExecutionProcedure } from './procedure-admission'
import { compileProcedureTemplate, instantiateProcedureTemplate, procedureInputSchema } from './procedure-template'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

function sourcePlan(path: string, content: string): WorkPlan {
  return { id: 'private-plan-name', cardId: 'alice', rootThreadId: 'private-task', rootObligationId: 'task:private-task', obligationGeneration: 1, revision: 1, acceptanceHash: 'unused-by-template', sourceEvidenceRefs: ['private-input'], steps: [{ id: 'private-step-name', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content }, inputHash: 'validated-by-source-admission', acceptanceCriterionIds: ['private-result-name'], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null }] }
}
const criterion = (path: string, content: string) => ({ id: 'private-result-name', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path, sha256: createHash('sha256').update(content).digest('hex') } })

describe('transferable procedure structure without private examples', () => {
  it('requires reevaluation after same-version permission, execution or recovery policy changes', () => {
    const registry = createCanonicalToolRegistry()
    const target = join(tmpdir(), 'policy-contract.txt')
    const template = compileProcedureTemplate(sourcePlan(target, 'text'), [criterion(target, 'text')], registry)
    const tool = registry.resolveActive('tool.filesystem_write_file')!
    const changes: Partial<CapabilityManifest>[] = [
      { permissions: [...tool.permissions, 'new-permission'] },
      { risk: 'critical' },
      { scope: tool.scope === 'turn' ? 'card' : 'turn' },
      { executionChannel: `${tool.executionChannel}.replacement` },
      { adapterToolName: `${tool.adapterToolName}.replacement` },
      { timeoutMs: tool.timeoutMs + 1 },
      { supportsProgress: !tool.supportsProgress },
      { supportsCancellation: !tool.supportsCancellation },
      { idempotency: tool.idempotency === 'none' ? 'required' : 'none' },
      { evaluationStatus: 'failed' },
    ]
    for (const change of changes) {
      registry.replace({ ...tool, ...change })
      expect(() => instantiateProcedureTemplate(template, { input1: target, input2: 'new text' }, registry, 'new request'), JSON.stringify(change)).toThrow(change.evaluationStatus ? 'unavailable' : 'reevaluation')
    }
    registry.replace({ ...tool, permissions: [...tool.permissions].reverse(), description: 'A clearer description' })
    expect(instantiateProcedureTemplate(template, { input1: target, input2: 'new text' }, registry, 'new request').steps[0].input.content).toBe('new text')
  })

  it('produces the same template across private paths and text, derives future byte proof and rejects argument scope changes', () => {
    const registry = createCanonicalToolRegistry()
    const firstPath = join(tmpdir(), '客户甲', 'private-report.txt')
    const secondPath = join(tmpdir(), '客户乙', 'another-report.txt')
    const first = compileProcedureTemplate(sourcePlan(firstPath, '第一份私有内容'), [criterion(firstPath, '第一份私有内容')], registry)
    const second = compileProcedureTemplate(sourcePlan(secondPath, '不同的私有内容🙂'), [criterion(secondPath, '不同的私有内容🙂')], registry)
    expect(first).toEqual(second)
    const serialized = JSON.stringify(first)
    for (const privateValue of [firstPath, '客户甲', '第一份私有内容', 'private-plan-name', 'private-step-name', 'private-result-name', 'private-input'])
      expect(serialized).not.toContain(privateValue)
    expect(first.parameters).toEqual([{ name: 'input1', kind: 'path', role: 'file' }, { name: 'input2', kind: 'text', role: 'content' }])
    expect(procedureInputSchema(first)).toMatchObject({ type: 'object', additionalProperties: false, required: ['input1', 'input2'] })
    const expanded = instantiateProcedureTemplate(first, { input1: secondPath, input2: '第三次的新文本\n🙂' }, registry, 'A fresh requested goal')
    expect(expanded.steps[0].input).toEqual({ path: secondPath, content: '第三次的新文本\n🙂' })
    expect(expanded.criteria[0].predicate).toEqual({ kind: 'file-bytes', path: secondPath, sha256: createHash('sha256').update('第三次的新文本\n🙂').digest('hex') })
    expect(() => instantiateProcedureTemplate(first, { input1: 'relative.txt', input2: 'text' }, registry, 'goal')).toThrow('input domain')
    expect(() => instantiateProcedureTemplate(first, { input1: secondPath, input2: 'text', capabilityId: 'tool.desktop_press_keys' }, registry, 'goal')).toThrow('parameter set')
    const tool = registry.resolveActive('tool.filesystem_write_file')!
    registry.replace({ ...tool, version: 'changed-interface' })
    expect(() => instantiateProcedureTemplate(first, { input1: secondPath, input2: 'text' }, registry, 'goal')).toThrow('reevaluation')
  })

  it('runs a source and a different-input instantiation through actual SQLite responsibilities and native file I/O', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'life-procedure-transfer-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const registry = createCanonicalToolRegistry()
    const broker = createExecutionResourceBroker()
    const errors: unknown[] = []
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: directory, signal }) } })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    async function execute(turnId: string, goal: string, proposal: Parameters<typeof runtime.propose>[0]) {
      await life.admit({ cardId: 'alice', turnId, conversationId: 'synthetic-evaluation', messages: [{ role: 'user', content: goal }] }, new AbortController().signal)
      const result = await runtime.propose(proposal)
      await life.settle({ cardId: 'alice', turnId, status: 'completed' })
      const deadline = Date.now() + 7000
      while (Date.now() < deadline) {
        const view = await db.readLifeState({ executionPlanId: result.planId })
        if (errors.length)
          throw errors[0]
        if (view.obligations.find(item => item.threadId === result.rootThreadId)?.status === 'fulfilled')
          return { view, result }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      throw new Error('The independently verified responsibility did not finish')
    }
    try {
      const originalPath = join(directory, '原始私有文本.txt')
      const content = '源任务的私有内容🙂'
      const original = sourcePlan(originalPath, content)
      const first = await execute('first-request', 'Save a private source', { cardId: 'alice', turnId: 'first-request', goal: 'Save a private source', criteria: [criterion(originalPath, content)], steps: original.steps })
      const thread = (await db.getTaskThread(first.result.rootThreadId))!
      expect(admitVerifiedExecutionProcedure(thread, first.view)).toBe(true)
      const plan = first.view.execution!.plans[0]
      const template = compileProcedureTemplate(plan, first.view.execution!.contracts[0].criteria, registry)
      const before = await stat(originalPath)
      const nextPath = join(directory, 'different-input.txt')
      const proposal = instantiateProcedureTemplate(template, { input1: nextPath, input2: '新的用户内容\n第二行🙂' }, registry, 'Save a different current request')
      const next = await execute('new-request', proposal.goal, { ...proposal, cardId: 'alice', turnId: 'new-request' })
      expect(next.view.obligations.find(item => item.threadId === next.result.rootThreadId)?.verification).toMatchObject({ verdict: 'satisfied', independent: true })
      expect(await readFile(nextPath, 'utf8')).toBe('新的用户内容\n第二行🙂')
      expect(await readFile(originalPath, 'utf8')).toBe(content)
      expect((await stat(originalPath)).mtimeMs).toBe(before.mtimeMs)
      expect(errors).toEqual([])
    }
    finally { await runtime.dispose(); await db.close(); await rm(directory, { recursive: true, force: true }) }
  }, 15_000)
})
