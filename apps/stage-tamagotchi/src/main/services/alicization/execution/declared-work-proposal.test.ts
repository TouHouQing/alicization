import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { declaredWorkProposal, matchesDeclaredWorkProposal } from './declared-work-proposal'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

function proposal(root: string) {
  const path = join(root, 'live2d-report.txt')
  return { goal: '保存指定内容并读取指定来源', criteria: [{ id: 'file', required: true, proofScope: 'structure' as const, predicate: { kind: 'text-content' as const, path, includes: ['exact {text} "中文🙂"'] } }], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'exact {text} "中文🙂"' }, dependsOn: [], acceptanceCriterionIds: ['file'] }, { id: 'source', capabilityId: 'tool.filesystem_read_file', input: { path: join(root, 'live2d-source.txt') }, dependsOn: ['save'], acceptanceCriterionIds: [] }] }
}

it('reads exact bounded structured request data with JSON escaping, preserving all parameters', () => {
  const value = proposal(tmpdir())
  const source = `请按参数执行：\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\``
  const declared = declaredWorkProposal(source)!
  expect(declared.proposal).toEqual(value)
  expect(matchesDeclaredWorkProposal(value, declared)).toBe(true)
  const changed = structuredClone(value)
  changed.steps[1].input.path = String(changed.steps[1].input.path).replace('live2d', 'live2')
  expect(matchesDeclaredWorkProposal(changed, declared)).toBe(false)
  changed.steps = value.steps
  changed.criteria[0].predicate.includes = ['a weaker requirement']
  expect(matchesDeclaredWorkProposal(changed, declared)).toBe(false)
  expect(declaredWorkProposal(`${source}\n${JSON.stringify(value)}`)?.hash).toBe(declared.hash)
  expect(() => declaredWorkProposal(`${source}\n${JSON.stringify(changed)}`)).toThrow('different work plans')
  expect(declaredWorkProposal('普通对话 {不是 JSON} 和 {"note":"not a work plan"}')).toBeNull()
  expect(() => declaredWorkProposal('x'.repeat(256001))).toThrow('budget')
  expect(() => declaredWorkProposal('{'.repeat(65))).toThrow('nesting')
})

it('rejects a changed source path before responsibility admission and never calls the file adapter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-declared-work-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const write = vi.fn()
  const read = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_write_file': write, 'tool.filesystem_read_file': read }, onError: () => {} })
  try {
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now })
    const exact = proposal(root)
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: `只按指定参数执行，不要自行创建来源文件。参数：${JSON.stringify(exact)}` }] }, signal)
    const changed = structuredClone(exact)
    changed.steps[1].input.path = String(changed.steps[1].input.path).replace('live2d-source', 'live2-source')
    const before = await db.readLifeState()
    await expect(runtime.propose({ ...changed, cardId: 'alice', turnId: 'request' })).rejects.toThrow('exact parameters')
    const rejected = await db.readLifeState()
    expect(rejected.obligations).toEqual(before.obligations)
    expect(rejected.execution?.plans).toEqual(before.execution?.plans)
    expect(write).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
    await runtime.propose({ ...exact, cardId: 'alice', turnId: 'request' })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect((await db.readLifeState()).execution?.plans).toHaveLength(1)
    expect(write).not.toHaveBeenCalled()
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
