import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { compactMessagesForPromptAssembly } from '@proj-alicization/stage-ui/composables/alicization-guardrails'
import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { declaredWorkProposal } from './declared-work-proposal'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it.each(['inline', 'reference'])('retains the complete renderer request in the life source and enforces its declared twenty-one-step admission: %s', async (mode) => {
  const directory = await mkdtemp(join(tmpdir(), 'life-long-request-'))
  const database = await setupAlicizationDb(join(directory, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const write = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: (error) => {
    throw error
  }, tools: { 'tool.filesystem_write_file': write } })
  try {
    const proposal = {
      goal: '完整保留当前二十一步请求',
      criteria: [{ id: 'review', required: true, proofScope: 'user-reported' as const, predicate: { kind: 'user-review' as const, question: '所有原始内容均符合要求吗？', artifactIds: [] } }],
      steps: Array.from({ length: 21 }, (_, index) => ({ id: `step-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path: join(directory, `part-${index}.txt`), content: `${'literal data 中文🙂 '.repeat(40)}[link](https://example.invalid/${index})` }, dependsOn: index ? [`step-${index - 1}`] : [], acceptanceCriterionIds: [] })),
    }
    const current = `请按原始内容执行：${JSON.stringify(proposal)}`
    expect(current.length).toBeGreaterThan(7200)
    const assembly = compactMessagesForPromptAssembly([{ role: 'user', content: current }])
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    await life.admit({ cardId: 'alice', turnId: 'long-request', conversationId: 'owned-cross-subsystem', messages: assembly.messages }, new AbortController().signal)
    expect(await database.getLifeUserInput('user:long-request')).toEqual({ role: 'user', content: current })
    await expect(runtime.propose({ ...proposal, goal: 'provider silently shortened the current goal', cardId: 'alice', turnId: 'long-request' })).rejects.toThrow('exact parameters')
    const reference = { sourceInputId: 'user:long-request', proposalHash: declaredWorkProposal(current)!.hash }
    await expect(runtime.proposeDeclared({ ...reference, sourceInputId: 'user:foreign-request', cardId: 'alice', turnId: 'long-request' })).rejects.toThrow('current user request')
    await expect(runtime.proposeDeclared({ ...reference, proposalHash: '0'.repeat(64), cardId: 'alice', turnId: 'long-request' })).rejects.toThrow('hash changed')
    const accepted = mode === 'reference'
      ? await runtime.proposeDeclared({ ...reference, cardId: 'alice', turnId: 'long-request' })
      : await runtime.propose({ ...proposal, cardId: 'alice', turnId: 'long-request' })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    const view = await database.readLifeState({ executionPlanId: accepted.planId })
    expect(view.execution?.plans.find(item => item.id === accepted.planId)?.steps).toHaveLength(21)
    expect(view.obligations.find(item => item.threadId === accepted.rootThreadId)).toMatchObject({ summary: proposal.goal })
    expect(write).not.toHaveBeenCalled()
    expect(view.effects.filter(effect => effect.kind === 'execute')).toHaveLength(0)
    await database.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-declared-request', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:long-request', status: 'held' }] })
    await expect(runtime.proposeDeclared({ ...reference, cardId: 'alice', turnId: 'long-request' })).rejects.toThrow('active current user request')
  }
  finally {
    await runtime.dispose()
    await database.close()
    await rm(directory, { recursive: true, force: true })
  }
})
