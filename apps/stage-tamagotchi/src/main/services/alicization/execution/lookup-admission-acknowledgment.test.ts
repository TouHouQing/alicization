import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it.each([false, true])('binds nominal lookup admission only to the actual read-only plan, mutating=%s', async (mutating) => {
  const root = await mkdtemp(join(tmpdir(), 'lookup-admission-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const operation = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.filesystem_read_file': operation, 'tool.filesystem_search_files': operation, 'tool.filesystem_write_file': operation } })
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
  const signal = new AbortController().signal
  try {
    await life.admit({ cardId: 'alice', turnId: 'lookup', conversationId: 'primary', messages: [{ role: 'user', content: '搜索并读取指定资料。' }] }, signal)
    const path = join(root, 'known.txt')
    const goal = '查阅指定资料'
    await runtime.propose({ cardId: 'alice', turnId: 'lookup', goal, criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['needle'] } }], steps: mutating
      ? [{ id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'needle' }, dependsOn: [], acceptanceCriterionIds: ['file'] }]
      : [{ id: 'search', capabilityId: 'tool.filesystem_search_files', input: { path: root, query: 'needle', recursive: true }, dependsOn: [], acceptanceCriterionIds: [] }, { id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path }, dependsOn: ['search'], acceptanceCriterionIds: ['file'] }] })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    let quote = ''
    const grounding = createLifeReplyGroundingRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
      const record = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === goal)
      return JSON.stringify({ claims: [{ kind: 'task-acknowledgment', quote, binding: record?.binding ?? null, meaningMatchesBinding: true }] })
    } })
    const check = async () => grounding({ cardId: 'alice', turnId: 'lookup', text: quote, owners: (await db.readLifeState()).owners, signal })
    for (const text of ['只读搜索和按结果读取文件的任务已受理。', '我已提交只读搜索和读取任务。']) {
      quote = text
      expect((await check()).accepted, quote).toBe(!mutating)
    }
    quote = '写入文件的任务已受理。'
    expect((await check()).accepted, quote).toBe(mutating)
    for (const text of ['只读搜索和读取任务已完成。', '我已读取文件，任务已受理。', '只读搜索和读取任务已受理，然后上传文件。', '写入文件的任务已完成。']) {
      quote = text
      expect((await check()).accepted, quote).toBe(false)
    }
    expect(operation).not.toHaveBeenCalled()
    expect((await db.readLifeState()).obligations.some(item => item.status === 'fulfilled')).toBe(false)
  }
  finally {
    await runtime.dispose()
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})
