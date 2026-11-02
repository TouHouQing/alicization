import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { executionWorkAcknowledgment } from './work-acknowledgment'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('offers first-write language only when that write is actually the next dependency-ready operation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-next-step-intent-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  let ready = false
  const write = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => ready, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.filesystem_read_file': async (input, signal) => {
    const result = await callLocalFilesystem({ toolName: 'read_file', arguments: input, workspace: root, signal })
    ready = false
    return result
  }, 'tool.filesystem_write_file': write } })
  try {
    const source = join(root, 'source.txt')
    const path = join(root, 'report.txt')
    await writeFile(source, 'actual prerequisite')
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '先读来源，再按既定顺序写报告。' }] }, signal)
    const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '读取来源后保存报告', criteria: [{ id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['report'] } }], steps: [{ id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path: source }, dependsOn: [], acceptanceCriterionIds: [] }, { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'report' }, dependsOn: ['read'], acceptanceCriterionIds: ['report'] }] })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    let quote = '我会按原计划先写第二个指定文件。'
    const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, commit: db.commitLifeState, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
      const goal = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '读取来源后保存报告')
      return JSON.stringify({ claims: [{ kind: 'task-acknowledgment', quote, binding: goal.binding, meaningMatchesBinding: true }] })
    } })
    const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
    let view = await db.readLifeState()
    let acknowledgment = executionWorkAcknowledgment(view, view.obligations.find(item => item.threadId === accepted.rootThreadId)!)!
    expect(acknowledgment.nextExecutableStepId).toBe('read')
    expect(acknowledgment.intentClauses).not.toContain('先写第二个指定文件')
    expect((await check()).accepted).toBe(false)
    ready = true
    await runtime.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'observe-prerequisite' })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    view = await db.readLifeState()
    acknowledgment = executionWorkAcknowledgment(view, view.obligations.find(item => item.threadId === accepted.rootThreadId)!)!
    expect(acknowledgment.nextExecutableStepId).toBe('write')
    expect(acknowledgment.intentClauses).toContain('先写第二个指定文件')
    const acceptedReply = await check()
    expect(acceptedReply.accepted, JSON.stringify(acceptedReply)).toBe(true)
    expect(write).not.toHaveBeenCalled()
    quote = '我会按要求只处理这个新文件；'
    expect((await check()).accepted).toBe(true)
    quote = '我会按要求只处理其他新文件；'
    expect((await check()).accepted).toBe(false)
    quote = '我会按要求只处理这个新文件并上传；'
    expect((await check()).accepted).toBe(false)
    const ambiguous = structuredClone(view)
    const plan = ambiguous.execution!.plans.find(item => item.id === accepted.planId)!
    plan.steps.push({ ...plan.steps[1], id: 'another-write', input: { path: join(root, 'other.txt'), content: 'another artifact' } })
    expect(executionWorkAcknowledgment(ambiguous, ambiguous.obligations.find(item => item.threadId === accepted.rootThreadId)!)?.intentClauses).not.toContain('只处理这个新文件')
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})

it('acknowledges intent only for a current accepted plan, then rejects renewed promises after pause or fulfilment', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-work-intent-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  let ready = false
  const errors: unknown[] = []
  const write = vi.fn((input: Record<string, unknown>, signal: AbortSignal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }))
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => ready, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': write, 'tool.filesystem_read_file': (input, signal) => callLocalFilesystem({ toolName: 'read_file', arguments: input, workspace: root, signal }) } })
  try {
    const path = join(root, 'report.txt')
    const source = join(root, 'source.txt')
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '按这份计划保存报告；遇到阻塞时等我确认，不要自行重试。' }] }, signal)
    const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: 'Save this accepted report', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['accepted report'] } }], steps: [{ id: 'save', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content: 'accepted report' }, acceptanceCriterionIds: ['file'] }, { id: 'source', dependsOn: ['save'], capabilityId: 'tool.filesystem_read_file', input: { path: source }, acceptanceCriterionIds: [] }] })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    let quote = '我会按原计划执行；如果第二步因来源文件缺失而阻塞，会等你在界面纠正后再继续，不会自行重试或创建来源文件。'
    let kind = 'task-acknowledgment'
    let omitBinding = false
    const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
      const facts = JSON.parse(user)
      const goal = facts.obligations.find((item: { summary: string }) => item.summary === 'Save this accepted report')
      return JSON.stringify({ claims: [{ kind, quote, binding: omitBinding ? null : goal.binding, meaningMatchesBinding: !omitBinding }] })
    } })
    const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
    expect((await check()).accepted).toBe(true)
    expect(write).not.toHaveBeenCalled()
    quote = '计划已受理，工作计划已受理；目前仍待执行，文件尚未确认写入，验收也尚待进行。'
    expect((await check()).accepted).toBe(true)
    quote = '进展页面验收还待完成；报告是否符合要求，也需要你确认。'
    expect((await check()).accepted).toBe(true)
    const intents = ['会按你给定的步骤执行，', '将按照原计划处理。', '我会按原参数执行；', '我会按你提供的参数处理。', '我会按指定内容执行，', '我会按原计划先写第一个指定文件；', '我会按你给定的步骤和顺序处理；', '按原计划执行：只写第一个指定的新文件；', '我会按你的要求执行。', '我会按原计划执行。', '我会按你指定的范围执行；', '接下来我们将按照你允许的步骤推进。', '我会只按这份方案处理。', '我会按原计划处理：只写第一个指定文件；第二步的来源文件等你在界面纠正，我不会自行重试、创建来源或改动计划。', '我会按计划执行，并遵守你说的限制：只写第一个指定文件；若第二步因来源缺失而阻塞，我不会自行重试、创建来源或改动计划，会等你在界面纠正后再继续。']
    for (const intent of intents) {
      quote = intent
      const reviewed = await check()
      expect(reviewed.accepted, JSON.stringify({ intent, reviewed })).toBe(true)
    }
    quote = '我会按原计划执行。'
    omitBinding = true
    expect((await check()).accepted).toBe(true)
    quote = '我会按你的要求不重试、不创建来源文件，也不改变计划。'
    kind = 'future-task'
    expect((await check()).accepted).toBe(true)
    quote = '我会按你的要求不重试、不创建来源文件，也不改变计划，但我会上传文件。'
    expect((await check()).accepted).toBe(false)
    kind = 'task-acknowledgment'
    quote = '我会按你的要求不自行重试、创建来源或修改计划。'
    expect((await check()).accepted).toBe(true)
    quote = '我不会自行重试、创建来源文件或更改计划；'
    kind = 'future-task'
    expect((await check()).accepted).toBe(true)
    for (const extra of ['但我已经创建了来源文件', '、上传文件', '并更改其他计划']) {
      quote = `我不会自行重试、创建来源文件或更改计划${extra}`
      expect((await check()).accepted, quote).toBe(false)
    }
    quote = '目前还没有步骤执行结果。'
    kind = 'execution-step-outcome'
    expect((await check()).accepted).toBe(true)
    kind = 'task-acknowledgment'
    omitBinding = false
    for (const unsupported of ['我会按其他参数执行', '我会按其他内容执行', '目前仍待执行并删除其他文件', '验收也尚待进行并上传文件', '我会按原参数执行并上传文件', '我会按原参数执行并删除其他文件', '我会按原计划先写第二个指定文件', '我会按原计划先写第一个指定文件并上传文件', '我会按你给定的步骤和顺序处理并上传文件', '我会按你给定的其他步骤和顺序处理', '按原计划执行：只写第二个指定的新文件', '按原计划执行：只写第一个指定的新文件并删除其他文件', '我会按原计划处理：只写第二个指定文件', '我会按原计划处理：只写第一个指定文件并删除其他文件', '我会按原计划处理：只写第一个其他文件', '我会按原计划处理：只上传第一个指定文件']) {
      quote = unsupported
      expect((await check()).accepted, quote).toBe(false)
    }
    for (const extra of ['文件已保存', '我会删除其他文件', '我已重新执行']) {
      quote = `我会按原计划执行；${extra}`
      expect((await check()).accepted, quote).toBe(false)
    }
    quote = '我会按原计划执行。'
    await runtime.stop({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'pause', action: 'pause' })
    for (const intent of intents) {
      quote = intent
      expect((await check()).accepted, intent).toBe(false)
    }
    omitBinding = true
    expect((await check()).accepted).toBe(false)
    omitBinding = false
    await writeFile(source, 'Host supplied source')
    ready = true
    await runtime.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'explicit-continue' })
    await vi.waitFor(async () => expect((await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('fulfilled'), { timeout: 7000 })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    omitBinding = true
    kind = 'execution-step-outcome'
    quote = '目前还没有步骤执行结果。'
    expect((await check()).accepted).toBe(false)
    omitBinding = false
    quote = '我会按原计划执行。'
    kind = 'task-acknowledgment'
    expect((await check()).accepted).toBe(false)
    kind = 'future-task'
    expect((await check()).accepted).toBe(false)
    kind = 'task-complete'
    quote = '报告已经完成。'
    expect((await check()).accepted).toBe(true)
    expect(await readFile(path, 'utf8')).toBe('accepted report')
    expect(write).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])
  }
  finally {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
