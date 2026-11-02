import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'
import type { ToolRegistry } from '../turn-os/tool-registry'

import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createAlicizationRuntimeCardScopeOrchestrator } from '../runtime-card-scope-orchestrator'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createProcedureCandidateRepository } from './procedure-candidate-repository'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

it('publishes independently verified learning while the same card foreground dialogue still owns delivery scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-learning-before-delivery-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const registry = createCanonicalToolRegistry()
  const repository = createProcedureCandidateRepository(database, 'alice', registry)
  const broker = createExecutionResourceBroker()
  const releaseForeground = Promise.withResolvers<void>()
  const foregroundEntered = Promise.withResolvers<void>()
  const deliveryQueued = Promise.withResolvers<void>()
  const scope = createAlicizationRuntimeCardScopeOrchestrator({ scopeLifecycleQueueState: { queue: Promise.resolve() }, now: Date.now, getActiveCardId: () => 'alice', normalizeCardId: String, sanitizeText: String, appendRuntimeDebugLine: async () => {}, switchCardScopeInner: async () => {} })
  const foreground = scope.withCardScope('alice', async () => {
    foregroundEntered.resolve()
    await releaseForeground.promise
  }, { lane: 'foreground', label: 'actual-current-dialogue' })
  await foregroundEntered.promise
  const errors: unknown[] = []
  let delivered = false
  const work = createWorkPlanExecutionRuntime({
    getDatabase: () => database,
    toolRegistry: () => registry,
    enabled: () => true,
    broker,
    interrupts: createExecutionInterruptRegistry(broker),
    onError: error => errors.push(error),
    onVerified: async (input: { database: AlicizationDbService, registry: ToolRegistry, plan: WorkPlan, thread: AlicizationTaskThreadRecord }) => {
      expect(input.database).toBe(database)
      expect(input.registry).toBe(registry)
      expect(input.plan.cardId).toBe('alice')
      await createProcedureCandidateRepository(input.database, input.plan.cardId, input.registry).capture(input.thread.id)
    },
    onSettled: async ({ thread }) => {
      deliveryQueued.resolve()
      await scope.withCardScope('alice', async () => {
        await repository.capture(thread.id)
        delivered = true
      }, { lane: 'background', label: 'quiet-work-delivery' })
    },
    tools: { 'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }) },
  })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  try {
    const path = join(root, 'source.txt')
    const text = 'Independently checked while the original dialogue is still open 中文🙂'
    await life.admit({ cardId: 'alice', turnId: 'current', conversationId: 'primary', messages: [{ role: 'user', content: 'Create this owned file and learn after independent verification.' }] }, new AbortController().signal)
    const accepted = await work.propose({ cardId: 'alice', turnId: 'current', goal: 'Owned independently checked work', criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update(text).digest('hex') } }], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path, content: text }, dependsOn: [], acceptanceCriterionIds: ['bytes'] }] })
    await vi.waitFor(async () => {
      expect((await database.readLifeState({ executionPlanId: accepted.planId })).obligations.find(item => item.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true } })
      expect(work.isActive()).toBe(false)
    }, { timeout: 10000 })
    await deliveryQueued.promise
    expect(delivered).toBe(false)
    expect((await database.getLifeIngress('user:current'))?.status).toBe('accepted')
    expect(await readFile(path, 'utf8')).toBe(text)
    expect(await repository.list()).toMatchObject([{ candidate: { source: { threadId: accepted.rootThreadId } }, sourceValid: true }])
    expect(errors).toEqual([])
  }
  finally {
    releaseForeground.resolve()
    await foreground
    await life.settle({ cardId: 'alice', turnId: 'current', status: 'completed' })
    await work.dispose()
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
