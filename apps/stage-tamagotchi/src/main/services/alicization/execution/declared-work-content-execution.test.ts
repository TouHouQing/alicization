import type { ExecutionWorkProposal } from '../../../../shared/execution-contracts'

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { restoreDeclaredWorkContent } from './declared-work-content'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('keeps source transcription separate from admission, then verifies one actual write of the original bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-source-content-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  let ready = false
  const errors: unknown[] = []
  const write = vi.fn((input: Record<string, unknown>, signal: AbortSignal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }))
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => ready, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_write_file': write }, onError: error => errors.push(error) })
  try {
    const path = join(root, 'original.txt')
    const content = '原始中文🙂\n$() `text`\r\n最后一行'
    const exact: ExecutionWorkProposal = { goal: '保存原始文字', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: [content] } }], steps: [{ id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content }, dependsOn: [], acceptanceCriterionIds: ['file'] }] }
    const source = `按参数执行：${JSON.stringify(exact)}`
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: source }] }, new AbortController().signal)
    const candidate = structuredClone(exact)
    candidate.steps[0].input.content = '模型丢失了内容'
    const restored = restoreDeclaredWorkContent(candidate as unknown as Record<string, unknown>, source)
    expect(restored.projection?.actionAdmitted).toBe(false)
    expect((await db.readLifeState()).execution?.plans ?? []).toEqual([])
    expect(write).not.toHaveBeenCalled()
    const accepted = await runtime.propose({ ...restored.input as unknown as ExecutionWorkProposal, cardId: 'alice', turnId: 'request' })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect(write).not.toHaveBeenCalled()
    ready = true
    await runtime.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'continue-current-work' })
    await vi.waitFor(async () => expect((await db.readLifeState()).obligations.find(goal => goal.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } }), { timeout: 7000 })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    expect(await readFile(path, 'utf8')).toBe(content)
    expect(write).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
