import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { executeClaudeCodeTaskThread } from '../executor-adapters/claude-code'
import { executeCliTaskThread } from '../executor-adapters/cli'
import { executeCodexTaskThread } from '../executor-adapters/codex'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'

it.skipIf(process.platform !== 'win32')('stops the actual detached CLI writer while preserving uncertain effects in the original life ledger', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-owned-detached-writer-'))
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const ready = join(workspace, 'detached.pid')
  const late = join(workspace, 'forbidden-after-stop.txt')
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: broker, now: Date.now })
  const controller = new AbortController()
  let running: ReturnType<typeof executeCliTaskThread> | undefined
  try {
    const child = `require('node:fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(late)},'late'),20000)`
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{detached:true,stdio:'ignore',windowsHide:true});setInterval(()=>{},1000)`
    const parameters = { command: 'node', args: ['-e', parent], cwd: workspace }
    await life.admit({ cardId: 'alice', turnId: 'owned-process-tree', conversationId: 'owned-process-tree', messages: [{ role: 'user', content: 'Only run and stop this owned synthetic process tree.' }] }, controller.signal)
    const manifest = createCanonicalToolRegistry().resolveActive('coding_agent.cli')!
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'owned-process-tree', actionId: 'owned-process-tree', capabilityId: manifest.capabilityId, parameters, effectContract: manifest.effects }, controller.signal)
    await action.authorizeDispatch(parameters)
    const thread: AlicizationTaskThreadRecord = { id: 'owned-process-tree', decisionTraceId: 'owned-process-tree', turnId: 'owned-process-tree', sessionId: 'owned-process-tree', origin: 'user-turn', goal: 'Only stop the owned writer', kind: 'run-command', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', summary: '', metadata: { task: { effect: 'mutate', permissionMode: 'explicit' } }, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null }
    running = withActionDispatch(action.assertDispatchCurrent, () => executeCliTaskThread({ thread, command: parameters, workspaceRoot: workspace, processJobsRoot: join(root, 'native'), abortSignal: controller.signal }))
    const deadline = Date.now() + 10_000
    let descendantPid: number | undefined
    while (Date.now() < deadline) {
      descendantPid = await readFile(ready, 'utf8').then(value => Number(value), () => undefined)
      if (descendantPid)
        break
      const early = await Promise.race([running.then(result => result), new Promise<null>(resolveWait => setTimeout(() => resolveWait(null), 20))])
      if (early)
        throw new Error(`Owned writer failed admission: ${early.errorCode}`)
    }
    expect(descendantPid).toBeGreaterThan(0)
    expect(() => process.kill(descendantPid!, 0)).not.toThrow()
    controller.abort('Owned cancellation after actual native actuation')
    const result = await running
    expect(result).toMatchObject({ ok: false, finalStatus: 'cancelled', errorCode: 'CLI_ABORTED' })
    expect(result.events.find(event => event.kind === 'cancel')?.payload?.processTree).toMatchObject({ treeStopped: true, receipt: { started: true, activeProcesses: 0 } })
    expect(() => process.kill(descendantPid!, 0)).toThrow()
    await expect(readFile(late)).rejects.toMatchObject({ code: 'ENOENT' })
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: result, interrupted: true })
    // Ending a writer is distinct from proving all of its earlier file effects.
    expect(await database.getLifeEffect(action.id)).toMatchObject({ status: 'uncertain' })
    expect(broker.snapshot().some(lease => lease.effectId === action.id && lease.uncertain)).toBe(true)
    expect((await database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
  }
  finally {
    controller.abort('Owned cleanup')
    await running
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)

for (const channel of ['cli', 'codex', 'claude-code'] as const) {
  it.skipIf(process.platform !== 'win32').each([false, true])(`settles a preflight ${channel} boundary refusal only with its actual SQLite action receipt (serialized=%s)`, async (serialized) => {
    const directory = await mkdtemp(join(tmpdir(), 'life-boundary-refusal-'))
    const database = await setupAlicizationDb(directory, { cardId: 'alice' })
    try {
      const broker = createExecutionResourceBroker()
      const life = createLifeTurnRuntime({ read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, resourceBroker: broker, now: Date.now })
      const controller = new AbortController()
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'owned-fixture', messages: [{ role: 'user', content: '仅验证自有请求的派发前拒绝，不启动任何程序。' }] }, controller.signal)
      const capabilityId = channel === 'claude-code' ? 'coding_agent.claude_code' : `coding_agent.${channel}`
      const parameters = { ...(channel === 'cli' ? { command: 'echo', args: ['never run'] } : { prompt: 'Owned fixture; never run' }), cwd: 'D:\\private-outside', effect: 'mutate' }
      const manifest = createCanonicalToolRegistry().resolveActive(capabilityId)!
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'boundary-refusal', capabilityId, parameters, effectContract: manifest.effects }, controller.signal)
      await action.authorizeDispatch(parameters)
      const thread = { id: 'owned-fixture', turnId: 'request', sessionId: 'owned-fixture', origin: 'user-turn', goal: 'No child process', kind: 'run-command', status: 'planned', selectedChannel: channel, proposedChannel: channel, summary: '', metadata: {}, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null } as AlicizationTaskThreadRecord
      const options = { thread, workspaceRoot: 'C:\\owned-fixture', abortSignal: controller.signal }
      const result = await withActionDispatch(action.assertDispatchCurrent, () => channel === 'cli'
        ? executeCliTaskThread({ ...options, command: { command: 'echo', args: ['never run'], cwd: parameters.cwd } })
        : channel === 'codex'
          ? executeCodexTaskThread({ ...options, command: { prompt: 'Owned fixture; never run', cwd: parameters.cwd } })
          : executeClaudeCodeTaskThread({ ...options, command: { prompt: 'Owned fixture; never run', cwd: parameters.cwd } }))
      expect(result).toMatchObject({ ok: false, sideEffectState: 'none', effectMayHaveOccurred: false })
      expect(result.events.some(event => event.kind === 'dispatch')).toBe(false)
      controller.abort('Owned cancellation after the preflight refusal')
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: serialized ? JSON.parse(JSON.stringify(result)) : result, interrupted: true })
      expect(await database.getLifeEffect(action.id)).toMatchObject({ status: serialized ? 'uncertain' : 'settled' })
      expect(broker.snapshot().length).toBe(serialized ? 1 : 0)
      expect((await database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
    }
    finally {
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
}

it.each([false, true])('keeps actual CLI dispatch and the original SQLite action ledger coherent after source withdrawal: %s', async (withdraw) => {
  const directory = await mkdtemp(join(tmpdir(), 'life-process-dispatch-'))
  const database = await setupAlicizationDb(directory, { cardId: 'alice' })
  try {
    const broker = createExecutionResourceBroker()
    const life = createLifeTurnRuntime({ read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, resourceBroker: broker, now: Date.now })
    const signal = new AbortController().signal
    const parameters = { command: 'echo', args: ['actual owned dispatch fixture'] }
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'owned-fixture', messages: [{ role: 'user', content: '执行这个无副作用的自有回归命令。' }] }, signal)
    const manifest = createCanonicalToolRegistry().resolveActive('coding_agent.cli')!
    expect(manifest).toBeTruthy()
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'cli-dispatch', capabilityId: manifest.capabilityId, parameters, effectContract: manifest.effects }, signal)
    await action.authorizeDispatch(parameters)
    const thread = { id: 'owned-fixture', turnId: 'request', sessionId: 'owned-fixture', origin: 'user-turn', goal: 'Only the actual inert fixture', kind: 'run-command', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', summary: '', metadata: {}, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null } as AlicizationTaskThreadRecord
    const result = await withActionDispatch(action.assertDispatchCurrent, async () => {
      if (withdraw)
        await database.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-before-child', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:request', status: 'held' }] })
      return executeCliTaskThread({ thread, command: parameters, workspaceRoot: directory, abortSignal: signal })
    })
    expect(result.ok).toBe(!withdraw)
    if (withdraw)
      expect(result).toMatchObject({ errorCode: 'CLI_DISPATCH_REVOKED', effectMayHaveOccurred: false, sideEffectState: 'none', output: null })
    else
      expect(result.output?.trim()).toBe('actual owned dispatch fixture')
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: result.ok ? 'success' : 'failure', output: result, interrupted: false })
    expect(await database.getLifeEffect(action.id)).toMatchObject({ status: 'settled', receipt: { outcome: withdraw ? 'failure' : 'success' } })
    expect((await database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
  }
  finally {
    await database.close()
    await rm(directory, { recursive: true, force: true })
  }
})

it.each(['actual-refusal', 'serialized-copy', 'different-effect', 'contradictory-receipt'] as const)('settles a cancelled pre-spawn refusal only with the exact private action receipt: %s', async (mode) => {
  const directory = await mkdtemp(join(tmpdir(), 'life-cancel-before-spawn-'))
  const database = await setupAlicizationDb(directory, { cardId: 'alice' })
  try {
    const broker = createExecutionResourceBroker()
    const life = createLifeTurnRuntime({ read: database.readLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, commit: database.commitLifeState, resourceBroker: broker, now: Date.now })
    const controller = new AbortController()
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'owned-fixture', messages: [{ role: 'user', content: '只执行自有回归命令，取消时不要留下不存在的写入。' }] }, controller.signal)
    const parameters = { command: 'echo', args: ['must never run'] }
    const manifest = createCanonicalToolRegistry().resolveActive('coding_agent.cli')!
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'cancel-before-spawn', capabilityId: manifest.capabilityId, parameters, effectContract: manifest.effects }, controller.signal)
    await action.authorizeDispatch(parameters)
    const thread = { id: 'owned-fixture', turnId: 'request', sessionId: 'owned-fixture', origin: 'user-turn', goal: 'Only the actual inert fixture', kind: 'run-command', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', summary: '', metadata: {}, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null } as AlicizationTaskThreadRecord
    const result = await withActionDispatch(action.assertDispatchCurrent, () => executeCliTaskThread({
      thread,
      command: parameters,
      workspaceRoot: directory,
      abortSignal: controller.signal,
      onExecutionEvent: (event) => {
        if (event.kind === 'dispatch')
          controller.abort(new Error('owned-fixture-cancel-before-child'))
      },
    }))
    expect(result).toMatchObject({ ok: false, errorCode: 'CLI_ABORTED', sideEffectState: 'none', effectMayHaveOccurred: false })
    let settledId = action.id
    if (mode === 'different-effect') {
      const other = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'unrelated-effect', capabilityId: manifest.capabilityId, parameters, effectContract: manifest.effects }, new AbortController().signal)
      settledId = other.id
    }
    const output = mode === 'serialized-copy' ? JSON.parse(JSON.stringify(result)) : result
    if (mode === 'contradictory-receipt') {
      output.effectMayHaveOccurred = true
      output.sideEffectState = 'unknown'
    }
    await life.afterAction({ cardId: 'alice', id: settledId, outcome: 'failure', output, interrupted: true })
    expect(await database.getLifeEffect(settledId)).toMatchObject({ status: mode === 'actual-refusal' ? 'settled' : 'uncertain' })
    if (mode === 'actual-refusal')
      expect(broker.snapshot()).toHaveLength(0)
    else
      expect(broker.snapshot().some(lease => lease.effectId === settledId && lease.uncertain)).toBe(true)
    expect((await database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
  }
  finally {
    await database.close()
    await rm(directory, { recursive: true, force: true })
  }
})
