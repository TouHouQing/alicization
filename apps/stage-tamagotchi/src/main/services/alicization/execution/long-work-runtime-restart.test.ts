import type { ExecutionCriterion, ExecutionWorkProposal } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

describe('actual file organization across work windows and SQLite restart', () => {
  it.each([false, true].flatMap(hostEdit => [1, 2, 3].map(round => ({ hostEdit, round }))))('continues only unfinished native I/O and preserves host edits: $hostEdit, round $round', async ({ hostEdit, round }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-long-work-'))
    let database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
    const files = Array.from({ length: 10 }, (_, index) => ({
      source: join(root, 'source', `source-${index}.txt`),
      target: join(root, index % 2 ? 'odd' : 'even', `copy-${index}.txt`),
      content: `Original owned file ${index}, round ${round} 中文🙂\n${index % 2 ? 'odd' : 'even'}\n`,
    }))
    const indexPath = join(root, 'index.md')
    const indexText = `# Classified owned files\n${files.map((file, index) => `- [${index}](${file.target.replaceAll('\\', '/')})`).join('\n')}\n`
    const operations: Array<{ tool: string, path: string }> = []
    const errors: unknown[] = []
    let allowed = false
    let limit = 16
    const build = () => {
      const broker = createExecutionResourceBroker()
      return createWorkPlanExecutionRuntime({
        getDatabase: () => database,
        enabled: () => true,
        canContinue: () => allowed && operations.length < limit,
        broker,
        interrupts: createExecutionInterruptRegistry(broker),
        onError: error => errors.push(error),
        tools: Object.fromEntries(['read_file', 'write_file'].map(tool => [`tool.filesystem_${tool}`, async (input: Record<string, unknown>, signal: AbortSignal) => {
          const result = await callLocalFilesystem({ toolName: tool, arguments: input, workspace: root, signal })
          if (result.ok)
            operations.push({ tool, path: String(input.path) })
          return result
        }])),
      })
    }
    let runtime = build()
    try {
      await Promise.all(['source', 'even', 'odd'].map(directory => mkdir(join(root, directory))))
      await Promise.all(files.map(file => writeFile(file.source, file.content, { flag: 'wx' })))
      const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'organize', conversationId: 'owned-long-work', messages: [{ role: 'user', content: `请整理这十份自有文件，读取后按奇偶分类复制并生成索引：${JSON.stringify(files)}。索引写入 ${indexPath}。保留来源文件，只操作这个测试目录。` }] }, new AbortController().signal)
      const criteria: ExecutionCriterion[] = files.map((file, index) => ({ id: `copy-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: file.target, sha256: digest(file.content) } }))
      criteria.push({ id: 'index', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: indexPath, sha256: digest(indexText) } })
      for (const parity of [0, 1])
        criteria.push({ id: `members-${parity}`, required: true, proofScope: 'structure', predicate: { kind: 'directory-members', path: join(root, parity ? 'odd' : 'even'), names: files.flatMap((_, index) => index % 2 === parity ? [`copy-${index}.txt`] : []), exact: true } })
      const steps: ExecutionWorkProposal['steps'] = files.flatMap((file, index) => [
        { id: `read-${index}`, capabilityId: 'tool.filesystem_read_file', input: { path: file.source }, dependsOn: index ? [`write-${index - 1}`] : [], acceptanceCriterionIds: [] },
        { id: `write-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path: file.target, content: '@observed' }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'], select: { field: 'type', equals: 'text', valueField: 'text' } }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`copy-${index}`] },
      ])
      steps.push({ id: 'index', capabilityId: 'tool.filesystem_write_file', input: { path: indexPath, content: indexText }, dependsOn: ['write-9'], acceptanceCriterionIds: ['index'] })
      const accepted = await runtime.propose({ cardId: 'alice', turnId: 'organize', goal: '整理十个测试文件并生成分类目录和可打开索引', criteria, steps })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      allowed = true
      expect(await runtime.run({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'first-window' })).toMatchObject({ state: 'yielded', steps: 16 })
      expect(operations).toHaveLength(16)
      const old = await database.readLifeState({ executionPlanId: accepted.planId })
      const plan = old.execution!.plans.find(plan => plan.id === accepted.planId)!
      const completed = files.slice(0, 8)
      const times = await Promise.all(completed.map(async file => (await stat(file.target)).mtimeMs))
      expect(old.execution!.results.filter(result => result.planId === accepted.planId && result.state === 'verified')).toHaveLength(16)
      expect(old.obligations.find(item => item.id === plan.rootObligationId)?.status).not.toBe('fulfilled')
      await runtime.dispose()
      await database.close()
      if (hostEdit)
        await writeFile(files[0].target, 'Subsequent host edit; never overwrite this during restart recovery.')
      database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
      allowed = false
      runtime = build()
      expect(operations).toHaveLength(16)
      limit = 256
      allowed = true
      await runtime.run({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'second-window-after-restart' })
      expect(operations).toHaveLength(21)
      expect(new Set(operations.map(item => `${item.tool}:${item.path}`)).size).toBe(21)
      const view = await database.readLifeState({ executionPlanId: accepted.planId })
      const goal = view.obligations.find(item => item.id === plan.rootObligationId)!
      expect(goal).toMatchObject({ id: plan.rootObligationId, threadId: plan.rootThreadId, generation: 1, status: hostEdit ? 'blocked' : 'fulfilled', verification: { independent: true, verdict: hostEdit ? 'not-satisfied' : 'satisfied' } })
      expect(new Set(view.effects.filter(effect => effect.status === 'settled' && operations.some(operation => effect.payload.capabilityId === `tool.filesystem_${operation.tool}` && (effect.payload.parameters as Record<string, unknown>)?.path === operation.path)).map(effect => effect.turnId)).size).toBe(2)
      expect(await readFile(indexPath, 'utf8')).toBe(indexText)
      for (const [index, file] of files.entries()) {
        expect(await readFile(file.source, 'utf8')).toBe(file.content)
        expect(await readFile(file.target, 'utf8')).toBe(hostEdit && index === 0 ? 'Subsequent host edit; never overwrite this during restart recovery.' : file.content)
        if (index < 8 && (!hostEdit || index !== 0))
          expect((await stat(file.target)).mtimeMs).toBe(times[index])
      }
      if (hostEdit) {
        const editTime = (await stat(files[0].target)).mtimeMs
        const revised: ExecutionCriterion[] = criteria.map(criterion => criterion.id === 'copy-0' ? { ...criterion, predicate: { kind: 'file-bytes', path: files[0].target, sha256: digest('Subsequent host edit; never overwrite this during restart recovery.') } } : criterion)
        await runtime.changeCriteria({ cardId: 'alice', planId: plan.id, expectedRevision: 1, expectedGeneration: 1, contractHash: plan.acceptanceHash, criteria: revised, requestId: 'host-explicitly-accepts-own-edited-version' })
        await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'verify-revised-contract-without-replaying-io' })
        expect(operations).toHaveLength(21)
        const afterChange = await database.readLifeState({ executionPlanId: plan.id })
        expect(afterChange.obligations.find(item => item.id === goal.id)).toMatchObject({ id: goal.id, threadId: plan.rootThreadId, generation: 2, status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
        expect((await stat(files[0].target)).mtimeMs).toBe(editTime)
      }
      expect(errors).toEqual([])
    }
    finally {
      await runtime.dispose()
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  }, 60000)
})
