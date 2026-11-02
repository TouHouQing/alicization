import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { normalizeWorkProposal } from './work-plan-tool'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse())
    await cleanup()
})

it.each([
  { placeholders: false, shorthand: false },
  { placeholders: true, shorthand: false },
  { placeholders: false, shorthand: true },
  { placeholders: true, shorthand: true },
])('transfers actual directory-selected full copies without leaking ignored inputs: %j', async ({ placeholders, shorthand }) => {
  const root = await mkdtemp(join(tmpdir(), 'life-directory-procedure-'))
  const directory = join(root, '私人目录')
  await mkdir(directory)
  const name = '私人文件.txt'
  const source = join(directory, name)
  const target = join(root, 'private-copy.txt')
  const text = 'Private source contents must not enter the reusable method. 中文🙂\n'
  await writeFile(source, text)
  const before = await stat(source)
  const db = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const errors = vi.fn()
  const calls: string[] = []
  const runtime = createWorkPlanExecutionRuntime({
    getDatabase: () => db,
    enabled: () => true,
    broker,
    interrupts: createExecutionInterruptRegistry(broker),
    onError: errors,
    tools: Object.fromEntries(['list_directory', 'read_file', 'write_file'].map(toolName => [`tool.filesystem_${toolName}`, async (parameters: Record<string, unknown>, signal: AbortSignal) => {
      calls.push(toolName)
      return callLocalFilesystem({ toolName, arguments: parameters, workspace: root, signal })
    }])),
  })
  cleanups.push(async () => {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  })
  const signal = new AbortController().signal
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  await life.admit({ cardId: 'alice', turnId: 'copy', conversationId: 'directory-copy', messages: [{ role: 'user', content: `Find ${name} inside ${directory} and copy its entire contents to ${target}.` }] }, signal)
  const proposal = normalizeWorkProposal({ goal: 'Copy an observed selected entry', criteria: [{ id: 'copy', required: true, proofScope: 'bytes', predicate: { kind: 'file-matches-read', path: target, stepId: 'read' } }], steps: [
    { id: 'list', capabilityId: 'tool.filesystem_list_directory', input: { path: directory }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'read', capabilityId: 'tool.filesystem_read_file', input: placeholders ? { path: '@ignored-private-path' } : {}, inputBindings: [{ parameter: 'path', stepId: 'list', path: ['entries'], select: { field: 'name', equals: name, valueField: 'path' } }], dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path: target, ...(placeholders ? { content: '@ignored-private-content' } : {}) }, inputBindings: [{ parameter: 'content', stepId: 'read', path: shorthand ? ['content'] : ['content', '0', 'text'] }], dependsOn: [], acceptanceCriterionIds: ['copy'] },
  ] })
  const accepted = await runtime.propose({ cardId: 'alice', turnId: 'copy', ...proposal })
  await life.settle({ cardId: 'alice', turnId: 'copy', status: 'completed' })
  await vi.waitFor(() => expect(runtime.isActive(), JSON.stringify(errors.mock.calls)).toBe(false), { timeout: 10000 })
  const view = await db.readLifeState({ executionPlanId: accepted.planId })
  expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.verification).toMatchObject({ independent: true, verdict: 'satisfied' })
  expect(calls).toEqual(['list_directory', 'read_file', 'write_file'])
  expect(await readFile(target, 'utf8')).toBe(text)
  expect(errors).not.toHaveBeenCalled()

  const registry = createCanonicalToolRegistry()
  const repository = createProcedureCandidateRepository(db, 'alice', registry)
  const id = await repository.capture(accepted.rootThreadId)
  const candidate = await repository.get(id)
  expect(candidate.template.parameters.map(parameter => parameter.role)).toEqual(['file', 'selected-entry', 'file'])
  const serialized = JSON.stringify(candidate.template)
  for (const value of [root, name, text, '@ignored-private-path', '@ignored-private-content'])
    expect(serialized).not.toContain(value)
  const evaluation = await evaluateProcedureCandidate(id, candidate, registry, signal)
  expect(evaluation.status, JSON.stringify(evaluation.cases)).toBe('passed')
  expect(evaluation.cases.map(item => item.name)).toEqual(['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation'])
  await repository.recordEvaluation(evaluation)
  expect(await repository.list()).toMatchObject([{ sourceValid: true, evaluation: { status: 'passed' } }])
  expect(calls).toEqual(['list_directory', 'read_file', 'write_file'])
  expect(await readFile(source, 'utf8')).toBe(text)
  expect((await stat(source)).mtimeMs).toBe(before.mtimeMs)
}, 30000)
