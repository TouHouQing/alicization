import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from '../life-interface-risk'
import type { WorkDelegationCapability, WorkStepParent } from './work-delegation-contracts'

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { buildAlicizationExecutionRuntimeContext } from '../execution-runtime-context'
import { createAlicizationExecutorRuntime } from '../executor-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { dispatchTaskThread } from '../task-thread-dispatcher'
import { createTaskThreadOrchestrator } from '../task-thread-orchestrator'
import { createHostEffectControl } from './host-effect-control'
import { createExecutionResourceBroker } from './resource-broker'
import { workDelegationCapabilities } from './work-delegation-contracts'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkStepDelegation, readWorkStepDelegation, workDelegationThreadId } from './work-step-delegation'

async function fixture(capabilityId: WorkDelegationCapability, mode = 'normal') {
  const root = await mkdtemp(join(tmpdir(), 'alicization-work-delegation-'))
  const cwd = join(root, 'workspace')
  await mkdir(cwd)
  const file = join(cwd, 'result.txt')
  const text = 'Independently verified delegated result 中文🙂'
  const actualCli = mode.startsWith('actual-cli')
  const marker = join(cwd, 'started.txt')
  const script = mode === 'actual-cli-cancel'
    ? `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => {}, 1000)`
    : `require('node:fs').writeFileSync(${JSON.stringify(file)}, ${JSON.stringify(text)}); console.log('owned child complete'); ${mode === 'actual-cli-failure' ? 'process.exit(2)' : ''}`
  const parameters = capabilityId === 'coding_agent.cli'
    ? { command: actualCli ? 'node' : 'owned-test-adapter', ...(actualCli ? { args: ['-e', script] } : {}), cwd, effect: 'mutate' }
    : { prompt: 'Create the exact accepted fixture', cwd, effect: 'mutate', ...(mode === 'forged-permission' ? { permissionMode: 'bypassPermissions' } : {}) }
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const interrupts = createExecutionInterruptRegistry(broker)
  const errors: unknown[] = []
  let enabled = true
  let parent: WorkStepParent | undefined
  let childAuthority: ReturnType<typeof readWorkStepDelegation>
  const started = Promise.withResolvers<void>()
  const stopped = Promise.withResolvers<void>()
  const orchestrator = createTaskThreadOrchestrator(mode === 'actual-cli-workspace-replaced'
    ? { runDispatch: async (invocation) => {
        await rename(cwd, join(root, 'original-workspace'))
        await mkdir(cwd)
        return dispatchTaskThread(invocation.port, invocation.input)
      } }
    : undefined)
  for (const channel of ['codex', 'claude-code', 'cli'] as const)
    await database.upsertChannelCapabilityManifest({ channel, available: true, enabled: true, ready: true, sessionAffinity: true, lastCheckedAt: Date.now() })
  // Approval remains a synthetic port. Actual CLI modes run the unmocked
  // orchestrator, dispatcher, process adapter and owned Node child.
  const dispatch = vi.fn<Parameters<typeof createAlicizationExecutorRuntime>[0]['dispatchTaskThread']>(async (invocation) => {
    const context = readWorkStepDelegation()!
    childAuthority = context
    await context.assertCurrent()
    parent = structuredClone(context.parent)
    const thread = (await database.getTaskThread(invocation.input.threadId))!
    expect(thread.id).toBe(workDelegationThreadId(parent))
    expect(thread.metadata?.workStepParent).toEqual(parent)
    started.resolve()
    if (actualCli) {
      const result = await interrupts.run({ cardId: 'alice', threadId: invocation.input.threadId, signal: invocation.input.abortSignal }, signal => orchestrator.dispatch({ ...invocation, input: { ...invocation.input, abortSignal: signal } }))
      if (mode === 'actual-cli')
        expect(result.ok, JSON.stringify({ summary: result.summary, errorCode: result.errorCode, errorMessage: result.errorMessage })).toBe(true)
      stopped.resolve()
      return result
    }
    if (mode === 'cancel-running') {
      await new Promise<void>((resolve) => {
        invocation.input.abortSignal!.addEventListener('abort', () => resolve(), { once: true })
        if (invocation.input.abortSignal!.aborted)
          resolve()
      })
      const cancelled = await database.upsertTaskThread({ ...thread, status: 'cancelled', expectedUpdatedAt: thread.updatedAt })
      stopped.resolve()
      return { ok: false, finalStatus: 'cancelled', summary: 'Owned child stopped', thread: cancelled }
    }
    if (mode !== 'missing-artifact')
      await writeFile(file, text)
    const completed = await database.upsertTaskThread({ ...thread, status: 'completed', expectedUpdatedAt: thread.updatedAt })
    return { ok: true, finalStatus: 'completed', summary: 'Child operation completed', thread: completed, output: { childResultOnly: true } }
  })
  const executor = createAlicizationExecutorRuntime({ getAlicizationDb: () => database, appendAuditLog: async () => {}, dispatchTaskThread: dispatch, ensureSessionId: async () => 'qa', getCardKillSwitchState: () => 'ACTIVE', getGlobalKillSwitchState: () => 'ACTIVE', normalizeSessionId: value => String(value ?? ''), sanitizeText: (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback })
  const authorize = vi.fn<(request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>>(async (request) => {
    expect(request.previewText).toBe(JSON.stringify(parameters, null, 2))
    expect(request.effectDigest).toMatch(/^[a-f\d]{64}$/u)
    if (mode === 'denied')
      return { allow: false, reason: 'host-denied' }
    if (mode === 'owner-changed')
      enabled = false
    if (mode === 'workspace-replaced') {
      await rename(cwd, join(root, 'original-workspace'))
      await mkdir(cwd)
    }
    return { allow: true, reason: 'approved', approvalRef: 'actual-approval-port-fixture' }
  })
  const delegate = createWorkStepDelegation({ database: () => database, enabled: () => enabled, authorize, runtimeContext: async ({ cardId, turnId }) => buildAlicizationExecutionRuntimeContext({ cardId, turnId, sensorySnapshot: { running: false, stale: true, ageMs: 0, nextTickAt: null, sample: { collectedAt: Date.now(), time: { iso: new Date().toISOString(), local: 'QA', timezone: 'UTC' }, cpu: { usagePercent: 0, windowMs: 1000 }, memory: { freeMB: 1, totalMB: 1, usagePercent: 0 } }, capture: null } }), execute: input => executor.executeMainGatewayTaskThread(input) })
  const work = createWorkPlanExecutionRuntime({ getDatabase: () => database, enabled: () => enabled, broker, interrupts, onError: error => errors.push(error), tools: { [capabilityId]: (input, signal) => delegate(capabilityId, input, signal) } })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
  const proposal = { goal: 'Produce the accepted artifact', criteria: [{ id: 'file', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path: file, sha256: createHash('sha256').update(text).digest('hex') } }], steps: [{ id: 'delegate', capabilityId, input: parameters, dependsOn: [], acceptanceCriterionIds: ['file'] }] }
  const run = async () => {
    await life.admit({ cardId: 'alice', turnId: 'current', conversationId: 'qa', messages: [{ role: 'user', content: `Execute this exact proposal: ${JSON.stringify(proposal)}` }] }, new AbortController().signal)
    return work.propose({ ...proposal, cardId: 'alice', turnId: 'current' })
  }
  const idle = async () => {
    await vi.waitFor(() => expect(work.isActive()).toBe(false), { timeout: 10000 })
    return database.readLifeState()
  }
  return { root, cwd, file, marker, text, database, broker, work, executor, run, idle, dispatch, authorize, errors, started: started.promise, stopped: stopped.promise, parent: () => parent, childAuthority: () => childAuthority, close: async () => {
    await work.dispose()
    await orchestrator.dispose()
    await database.close()
    await rm(root, { recursive: true, force: true })
  } }
}

it.each(workDelegationCapabilities)('connects %s to the same parent, approval, executor, file verifier and durable result', async (capability) => {
  const f = await fixture(capability)
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.errors).toEqual([])
    expect(f.dispatch).toHaveBeenCalledTimes(1)
    expect(readWorkStepDelegation()).toBeNull()
    expect(view.obligations.filter(goal => goal.kind === 'task')).toHaveLength(1)
    await expect(f.childAuthority()!.assertCurrent()).rejects.toThrow('closed')
    expect(f.authorize).toHaveBeenCalledTimes(1)
    expect(await readFile(f.file, 'utf8')).toBe(f.text)
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
    expect(f.parent()).toMatchObject({ planId: accepted.planId, rootThreadId: accepted.rootThreadId, capabilityId: capability, stepId: 'delegate' })
    const child = (await f.database.getTaskThread(workDelegationThreadId(f.parent()!)))!
    await expect(f.database.upsertTaskThread({ ...child, metadata: { ...child.metadata, workStepParent: { ...f.parent()!, planId: 'foreign-plan' } }, expectedUpdatedAt: child.updatedAt })).rejects.toThrow('parent work responsibility')
    await expect(f.database.upsertTaskThread({ ...child, metadata: {}, expectedUpdatedAt: child.updatedAt })).rejects.toThrow('parent work responsibility')
    await expect(f.database.upsertTaskThread({ ...child, id: 'forged-child', createOnly: true, expectedUpdatedAt: undefined })).rejects.toThrow('child identity')
    expect(await f.database.getTaskThread('forged-child')).toBeUndefined()
    const resumed = await f.executor.resumeMainGatewayTaskThread({ context: { cardId: 'alice', turnId: 'unrelated', authorizationSource: 'human-ui' }, expectedChannel: child.selectedChannel!, threadId: child.id })
    expect(resumed).toMatchObject({ ok: false, errorCode: 'WORK_STEP_PARENT_REQUIRED' })
    expect(f.dispatch).toHaveBeenCalledTimes(1)
  }
  finally { await f.close() }
})

it('runs a real owned Node child through the parent work plan and verifies persisted artifact bytes independently', async () => {
  const f = await fixture('coding_agent.cli', 'actual-cli')
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.errors).toEqual([])
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect(f.authorize).toHaveBeenCalledOnce()
    expect(await readFile(f.file, 'utf8')).toBe(f.text)
    const child = await f.database.getTaskThread(workDelegationThreadId(f.parent()!))
    expect(child).toMatchObject({ status: 'completed', metadata: { workStepParent: f.parent() } })
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
    await expect(f.childAuthority()!.assertCurrent()).rejects.toThrow('closed')
  }
  finally { await f.close() }
})

it('cancels a real owned Node child from its parent without replaying it or certifying the missing artifact', async () => {
  const f = await fixture('coding_agent.cli', 'actual-cli-cancel')
  try {
    const accepted = await f.run()
    await vi.waitFor(async () => expect(await readFile(f.marker, 'utf8')).toBe('started'), { timeout: 10000 })
    await f.work.stop({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'stop-actual-owned-child', action: 'cancel' })
    await f.stopped
    const view = await f.idle()
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect((await f.database.getTaskThread(workDelegationThreadId(f.parent()!)))?.status).toBe('cancelled')
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('cancelled')
    expect(view.effects.find(effect => effect.kind === 'execute')?.status).toBe('uncertain')
    await expect(stat(f.file)).rejects.toMatchObject({ code: 'ENOENT' })
    const effect = view.effects.find(effect => effect.kind === 'execute')!
    const recovery = createHostEffectControl({ database: () => f.database, broker: f.broker, writerStopped: () => !f.work.isActive() })
    const input = { cardId: 'alice', effectId: effect.id }
    const review = await recovery({ ...input, action: 'preview' }, 18)
    if (review.state !== 'preview')
      throw new Error('Missing actual cancelled work review')
    expect(await recovery({ ...input, action: 'takeover', token: review.token, confirmedStopped: true }, 18)).toEqual({ state: 'host-taken-over' })
    expect(f.broker.snapshot()).toEqual([])
    const next = f.broker.acquire({ owner: 'next-independent-task', resources: ['host:execution'] })
    f.broker.settle(next, { stopped: true, uncertain: false })
    expect((await f.database.getLifeEffect(effect.id))?.receipt?.outcome).toBe('host-taken-over')
    const originalId = String(((await f.database.getLifeEffect(effect.id))!.receipt!.hostTakeover as Record<string, unknown>).originalReceiptId)
    expect((await f.database.getLifeIngress(originalId))?.payload.output).toMatchObject({ sideEffectState: 'unknown' })
  }
  finally { await f.close() }
})

it('revises denied command arguments through the host writer, then obtains new approval before the one actual dispatch', async () => {
  const f = await fixture('coding_agent.cli', 'actual-cli')
  try {
    f.authorize.mockResolvedValueOnce({ allow: false, reason: 'host wants to revise' })
    const accepted = await f.run()
    const previous = await f.idle()
    expect(f.dispatch).not.toHaveBeenCalled()
    const revision = { cardId: 'alice', planId: accepted.planId, expectedRevision: 1, stepId: 'delegate', requestId: 'host-command-edit' }
    const invalid: Array<Record<string, string>> = [{ effect: 'observe' }, { permissionMode: 'explicit' }, { args: '["ok", 1]' }, { args: JSON.stringify(['x'.repeat(2049)]) }]
    for (const changes of invalid)
      await expect(f.work.revise({ ...revision, changes })).rejects.toThrow()
    expect((await f.database.readLifeState()).execution?.plans[0].revision).toBe(1)
    const args = ['-e', `require('node:fs').writeFileSync(${JSON.stringify(f.file)}, ${JSON.stringify(f.text)}); console.log('revised owned invocation')`]
    await f.work.revise({ ...revision, changes: { args: JSON.stringify(args) } })
    const changed = (await f.database.readLifeState()).execution!.plans[0]
    expect(changed.steps[0].input.args).toEqual(args)
    expect(changed.steps[0].inputHash).not.toBe(previous.execution!.plans[0].steps[0].inputHash)
    f.authorize.mockImplementationOnce(async (request) => {
      expect(JSON.parse(request.previewText!).args).toEqual(args)
      return { allow: true, reason: 'reviewed new exact argv', approvalRef: 'second-host-review' }
    })
    await f.work.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 2, requestId: 'continue-host-revised-command' })
    const result = await f.idle()
    expect(f.errors).toEqual([])
    expect(f.authorize).toHaveBeenCalledTimes(2)
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect(f.parent()).toMatchObject({ planRevision: 2, approvalRef: 'second-host-review' })
    expect(await readFile(f.file, 'utf8')).toBe(f.text)
    expect(result.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('fulfilled')
  }
  finally { await f.close() }
})

it('refuses a replaced approved workspace at the actual process boundary and records that no child process started', async () => {
  const f = await fixture('coding_agent.cli', 'actual-cli-workspace-replaced')
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.errors).toEqual([])
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect((await f.database.getTaskThread(workDelegationThreadId(f.parent()!)))?.status).toBe('failed')
    const effect = view.effects.find(effect => effect.kind === 'execute')!
    expect(effect.status).not.toBe('uncertain')
    expect(effect.receipt?.output).toMatchObject({ effectMayHaveOccurred: false, sideEffectState: 'none' })
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).not.toBe('fulfilled')
    await expect(stat(f.file)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(join(f.root, 'original-workspace', 'result.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
})

it('retains a real failed command with partial writes as unknown and refuses to replay it on Continue', async () => {
  const f = await fixture('coding_agent.cli', 'actual-cli-failure')
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.errors).toEqual([])
    expect(await readFile(f.file, 'utf8')).toBe(f.text)
    expect((await f.database.getTaskThread(workDelegationThreadId(f.parent()!)))?.status).toBe('failed')
    expect(view.effects.find(effect => effect.kind === 'execute')?.status).toBe('uncertain')
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).not.toBe('fulfilled')
    const continued = await f.work.start({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'do-not-repeat-partial-command' })
    expect(continued.state).toBe('reconciliation-required')
    await f.idle()
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect(f.authorize).toHaveBeenCalledOnce()
  }
  finally { await f.close() }
})

it('does not use a successful child result as root completion without the independently required artifact', async () => {
  const f = await fixture('coding_agent.codex', 'missing-artifact')
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.errors).toEqual([])
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).not.toBe('fulfilled')
    await expect(stat(f.file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
})

it.each(['denied', 'owner-changed', 'workspace-replaced', 'forged-permission'])('starts no child after %s and retains an exact no-dispatch receipt', async (mode) => {
  const f = await fixture('coding_agent.codex', mode)
  try {
    const accepted = await f.run()
    const view = await f.idle()
    expect(f.dispatch).not.toHaveBeenCalled()
    const effect = view.effects.find(effect => effect.kind === 'execute')!
    expect(effect.receipt).toMatchObject({ output: { effectMayHaveOccurred: false, sideEffectState: 'none' } })
    expect(effect.status).not.toBe('uncertain')
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).not.toBe('fulfilled')
    await expect(stat(f.file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
})

it('passes parent cancellation to a running child and retains unknown code effects without replay or false completion', async () => {
  const f = await fixture('coding_agent.codex', 'cancel-running')
  try {
    const accepted = await f.run()
    await f.started
    await f.work.stop({ cardId: 'alice', planId: accepted.planId, expectedRevision: 1, requestId: 'stop-owned-child', action: 'cancel' })
    await f.stopped
    const view = await f.idle()
    expect(f.dispatch).toHaveBeenCalledOnce()
    expect(view.obligations.find(goal => goal.threadId === accepted.rootThreadId)?.status).toBe('cancelled')
    expect((await f.database.getTaskThread(workDelegationThreadId(f.parent()!)))?.status).toBe('cancelled')
    expect(view.effects.find(effect => effect.kind === 'execute')?.status).toBe('uncertain')
    await expect(stat(f.file)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally { await f.close() }
})
