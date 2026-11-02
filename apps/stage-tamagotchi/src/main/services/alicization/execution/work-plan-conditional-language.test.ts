import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('binds reordered write limits and hypothetical read-step conditions to the actual current plan without certifying an outcome', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-plan-condition-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const write = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.filesystem_write_file': write, 'tool.filesystem_read_file': vi.fn() } })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const signal = new AbortController().signal
  let quote = ''
  let bind = true
  let turnId = 'request'
  let claimKind = 'task-acknowledgment'
  try {
    const path = join(root, 'report.txt')
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '只写指定的第一个文件，然后读取指定来源文件；来源缺失时停下，不创建来源、不重试。' }] }, signal)
    const admitted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '指定的两步工作', criteria: [{ id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['report'] } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content: 'report' }, acceptanceCriterionIds: ['report'] }, { id: 'source', dependsOn: ['write'], capabilityId: 'tool.filesystem_read_file', input: { path: join(root, 'missing.txt') }, acceptanceCriterionIds: [] }] })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
      const binding = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '指定的两步工作')?.binding ?? null
      return JSON.stringify({ claims: [{ kind: claimKind, quote, binding: bind ? binding : null, meaningMatchesBinding: bind }] })
    } })
    const review = () => db.readLifeState().then(view => grounding({ cardId: 'alice', turnId, text: quote, owners: view.owners, signal }))
    for (const bound of [true, false]) {
      bind = bound
      for (const text of ['我只会写指定的第一个文件；', '第二步读取来源文件若因缺失而阻塞，', '第2步读取来源文件如果因缺失而失败，', '我只会写指定的第一个文件；第二步读取来源文件若因缺失而阻塞，我不会自行重试或改动计划。']) {
        quote = text
        expect((await review()).accepted, text).toBe(true)
      }
      for (const text of ['我只会写指定的第二个文件；', '我只会写指定的第一个文件并上传；', '第一步读取来源文件若因缺失而阻塞，', '第三步读取来源文件若因缺失而阻塞，', '第二步删除来源文件若因缺失而阻塞，', '第二步读取其他文件若因缺失而阻塞，', '第二步读取来源文件已因缺失而阻塞，', '第二步读取来源文件若因缺失而阻塞并删除文件，']) {
        quote = text
        expect((await review()).accepted, text).toBe(false)
      }
    }
    bind = true
    claimKind = 'future-task'
    quote = '第二步读取来源文件若因缺失而阻塞，我会上传文件。'
    expect((await review()).accepted).toBe(false)
    claimKind = 'task-acknowledgment'
    turnId = 'follow-up'
    await life.admit({ cardId: 'alice', turnId, conversationId: 'primary', messages: [{ role: 'user', content: '刚才的计划第二步如果来源缺失会怎样？' }] }, signal)
    quote = '第二步读取来源文件若因缺失而阻塞，'
    bind = true
    expect((await review()).accepted).toBe(true)
    bind = false
    expect((await review()).accepted).toBe(false)
    bind = true
    await runtime.stop({ cardId: 'alice', planId: admitted.planId, expectedRevision: 1, action: 'cancel', requestId: 'stop-plan' })
    expect((await review()).accepted).toBe(false)
    expect(write).not.toHaveBeenCalled()
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await db.readLifeState()).execution?.results).toEqual([])
  }
  finally {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)
